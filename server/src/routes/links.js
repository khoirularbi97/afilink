import { Router } from 'express';
import { customAlphabet } from 'nanoid';
import { query } from '../db.js';
import { cache } from '../lib/cache.js';
import { parse, linkCreateSchema, linkUpdateSchema } from '../lib/validate.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

const genSlug = customAlphabet('abcdefghijkmnpqrstuvwxyz23456789', 7);

// Semua query dibatasi user_id = req.user.id → afiliator hanya melihat link miliknya.

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT l.*,
              COUNT(c.id) FILTER (WHERE NOT c.is_bot)                          AS clicks,
              COUNT(c.id) FILTER (WHERE c.is_unique)                           AS unique_clicks,
              COUNT(c.id) FILTER (WHERE NOT c.is_bot AND c.clicked_at > now() - interval '24 hours') AS clicks_24h
         FROM links l
         LEFT JOIN clicks c ON c.link_id = l.id
        WHERE l.user_id = $1
        GROUP BY l.id
        ORDER BY l.created_at DESC`,
      [req.user.id],
    );
    res.json(rows.map((x) => ({ ...x, clicks: +x.clicks, unique_clicks: +x.unique_clicks, clicks_24h: +x.clicks_24h })));
  } catch (e) { next(e); }
});

r.post('/', async (req, res, next) => {
  const data = parse(linkCreateSchema, req.body, res); if (!data) return;
  try {
    // Slug otomatis kalau kosong; coba ulang kalau kebetulan bentrok.
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = data.slug || genSlug();
      try {
        const { rows } = await query(
          `INSERT INTO links (user_id, slug, target_url, title, campaign)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [req.user.id, slug, data.target_url, data.title || null, data.campaign || null],
        );
        cache.del(slug);
        return res.status(201).json(rows[0]);
      } catch (e) {
        if (e.code !== '23505') throw e;
        if (data.slug) return res.status(409).json({ error: 'Slug sudah dipakai, coba yang lain' });
      }
    }
    res.status(500).json({ error: 'Gagal membuat slug unik' });
  } catch (e) { next(e); }
});

r.patch('/:id', async (req, res, next) => {
  const data = parse(linkUpdateSchema, req.body, res); if (!data) return;
  const fields = Object.keys(data);
  if (!fields.length) return res.status(400).json({ error: 'Tidak ada perubahan' });
  try {
    const old = await query('SELECT slug FROM links WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!old.rows[0]) return res.status(404).json({ error: 'Link tidak ditemukan' });

    const sets = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const { rows } = await query(
      `UPDATE links SET ${sets}, updated_at = now() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id, ...fields.map((f) => data[f])],
    );
    cache.del(old.rows[0].slug);
    cache.del(rows[0].slug);
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Slug sudah dipakai' });
    next(e);
  }
});

r.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await query('DELETE FROM links WHERE id = $1 AND user_id = $2 RETURNING slug', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Link tidak ditemukan' });
    cache.del(rows[0].slug);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
