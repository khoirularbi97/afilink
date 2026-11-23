import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

const TZ = 'Asia/Jakarta';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Rentang default: 30 hari terakhir. ?from=YYYY-MM-DD&to=YYYY-MM-DD&link_id=
function range(req) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
  const to = DATE_RE.test(req.query.to) ? req.query.to : today;
  const from = DATE_RE.test(req.query.from) ? req.query.from
    : new Date(Date.parse(to) - 29 * 864e5).toISOString().slice(0, 10);
  const linkId = /^\d+$/.test(req.query.link_id || '') ? +req.query.link_id : null;
  return { from, to, linkId };
}

// Filter dasar: milik user, non-bot, dalam rentang tanggal WIB.
const BASE = `
  FROM clicks c JOIN links l ON l.id = c.link_id
 WHERE l.user_id = $1 AND NOT c.is_bot
   AND (c.clicked_at AT TIME ZONE '${TZ}')::date BETWEEN $2::date AND $3::date
   AND ($4::int IS NULL OR c.link_id = $4)`;

const breakdown = (col) =>
  `SELECT COALESCE(c.${col}, 'unknown') AS key, COUNT(*)::int AS clicks ${BASE}
   GROUP BY 1 ORDER BY 2 DESC LIMIT 10`;

r.get('/overview', async (req, res, next) => {
  const { from, to, linkId } = range(req);
  const p = [req.user.id, from, to, linkId];
  try {
    const [totals, daily, top, source, device, country, bots] = await Promise.all([
      query(`SELECT COUNT(*)::int AS clicks, COUNT(*) FILTER (WHERE c.is_unique)::int AS unique_clicks ${BASE}`, p),
      query(
        `SELECT d::date::text AS date,
                COUNT(c.id)::int AS clicks,
                COUNT(c.id) FILTER (WHERE c.is_unique)::int AS unique_clicks
           FROM generate_series($2::date, $3::date, interval '1 day') d
           LEFT JOIN links l ON l.user_id = $1 AND ($4::int IS NULL OR l.id = $4)
           LEFT JOIN clicks c ON c.link_id = l.id AND NOT c.is_bot
                AND (c.clicked_at AT TIME ZONE '${TZ}')::date = d::date
          GROUP BY 1 ORDER BY 1`, p),
      query(
        `SELECT l.id, l.slug, l.title, COUNT(*)::int AS clicks,
                COUNT(*) FILTER (WHERE c.is_unique)::int AS unique_clicks
           ${BASE} GROUP BY l.id ORDER BY 4 DESC LIMIT 10`, p),
      query(breakdown('source'), p),
      query(breakdown('device'), p),
      query(breakdown('city'), p),
      query(
        `SELECT COUNT(*)::int AS bot_clicks
           FROM clicks c JOIN links l ON l.id = c.link_id
          WHERE l.user_id = $1 AND c.is_bot
            AND (c.clicked_at AT TIME ZONE '${TZ}')::date BETWEEN $2::date AND $3::date
            AND ($4::int IS NULL OR c.link_id = $4)`, p),
    ]);

    res.json({
      range: { from, to },
      totals: { ...totals.rows[0], bot_clicks: bots.rows[0].bot_clicks },
      daily: daily.rows,
      top_links: top.rows,
      by_source: source.rows,
      by_device: device.rows,
      by_city: country.rows,
    });
  } catch (e) { next(e); }
});

// Klik terbaru (untuk tabel "aktivitas terkini" di dashboard)
r.get('/recent', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.clicked_at, l.slug, c.source, c.device, c.os, c.browser, c.city, c.is_unique, c.is_bot
         FROM clicks c JOIN links l ON l.id = c.link_id
        WHERE l.user_id = $1
        ORDER BY c.clicked_at DESC LIMIT 50`,
      [req.user.id],
    );
    res.json(rows);
  } catch (e) { next(e); }
});

export default r;
