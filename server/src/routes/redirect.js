import { Router } from 'express';
import crypto from 'node:crypto';
import { query } from '../db.js';
import { cache } from '../lib/cache.js';
import { parseVisitor } from '../lib/tracker.js';

const VID = 'vid';
const UUID_RE = /^[0-9a-f-]{36}$/i;

// Path pertama yang bukan slug: biar /:slug di root tidak menyentuh database untuk ini.
const SKIP = new Set(['favicon.ico', 'robots.txt', 'go', 'api', '']);

async function findLink(slug) {
  let link = cache.get(slug);
  if (link !== undefined) return link;
  const { rows } = await query(
    `SELECT l.id, l.target_url, l.is_active, u.status AS owner_status
       FROM links l JOIN users u ON u.id = l.user_id
      WHERE l.slug = $1`,
    [slug],
  );
  link = rows[0] || null;
  cache.set(slug, link);
  return link;
}

async function logClick(linkId, visitorId, v) {
  // Unik = belum ada klik non-bot dari visitor/fingerprint yang sama ke link ini dalam 24 jam.
  const { rows } = await query(
    `SELECT 1 FROM clicks
      WHERE link_id = $1 AND is_bot = false
        AND clicked_at > now() - interval '24 hours'
        AND (visitor_id = $2 OR fp = $3)
      LIMIT 1`,
    [linkId, visitorId, v.fp],
  );
  const isUnique = !v.is_bot && rows.length === 0;

  await query(
    `INSERT INTO clicks (link_id, visitor_id, fp, ip_hash, country, region, city,
                         device, os, browser, referrer, source, is_unique, is_bot)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [linkId, visitorId, v.fp, v.ip_hash, v.country, v.region, v.city,
     v.device, v.os, v.browser, v.referrer, v.source, isUnique, v.is_bot],
  );
}

async function redirect(req, res, next) {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    if (SKIP.has(slug)) return next();

    const link = await findLink(slug);
    if (!link || !link.is_active || link.owner_status !== 'active') {
      return res.status(404).type('html').send('<h3>Link tidak ditemukan atau sudah tidak aktif.</h3>');
    }

    // Cookie pengunjung untuk analitik di sistem kita sendiri (bukan cookie Shopee).
    let visitorId = req.cookies?.[VID];
    if (!visitorId || !UUID_RE.test(visitorId)) {
      visitorId = crypto.randomUUID();
      res.cookie(VID, visitorId, {
        httpOnly: true, sameSite: 'lax', path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 365 * 24 * 3600 * 1000,
      });
    }

    // Redirect dulu, catat belakangan — pengunjung tidak menunggu database/geo lookup.
    res.set('Cache-Control', 'no-store');
    res.redirect(302, link.target_url);

    parseVisitor(req)
      .then((visitor) => logClick(link.id, visitorId, visitor))
      .catch((e) => console.error('[click] gagal dicatat:', e.message));
  } catch (e) { next(e); }
}

// Bentuk panjang: /go/:slug — dipasang paling depan, tetap didukung untuk link lama.
export const goRedirect = Router();
goRedirect.get('/go/:slug', redirect);

// Bentuk pendek: /:slug — dipasang paling akhir, untuk domain pendek khusus
// (mis. s.scurebot.site/sepatu-murah). Di domain pendek, root hanya melayani redirect.
export const rootRedirect = Router();
rootRedirect.get('/:slug', redirect);

export default goRedirect;
