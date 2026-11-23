import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { parse } from '../lib/validate.js';
import { cache } from '../lib/cache.js';

const r = Router();
r.use(requireAuth, requireAdmin);

r.get('/users', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
              COUNT(DISTINCT l.id)::int AS links,
              COUNT(c.id) FILTER (WHERE NOT c.is_bot)::int AS clicks
         FROM users u
         LEFT JOIN links l ON l.user_id = u.id
         LEFT JOIN clicks c ON c.link_id = l.id
        GROUP BY u.id ORDER BY (u.status = 'pending') DESC, u.created_at DESC`,
    );
    res.json(rows);
  } catch (e) { next(e); }
});

const statusSchema = z.object({ status: z.enum(['active', 'suspended', 'pending']) });

// Approve / suspend afiliator
r.patch('/users/:id/status', async (req, res, next) => {
  const data = parse(statusSchema, req.body, res); if (!data) return;
  if (+req.params.id === req.user.id) return res.status(400).json({ error: 'Tidak bisa mengubah status akun sendiri' });
  try {
    const { rows } = await query(
      `UPDATE users SET status = $2 WHERE id = $1 RETURNING id, name, email, status`,
      [req.params.id, data.status],
    );
    if (!rows[0]) return res.status(404).json({ error: 'User tidak ditemukan' });
    cache.clear(); // link milik user yang di-suspend langsung mati
    res.json(rows[0]);
  } catch (e) { next(e); }
});

export default r;
