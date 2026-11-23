import crypto from 'node:crypto';
import { UAParser } from 'ua-parser-js';
// fast-geoip membaca data dari disk sesuai kebutuhan (~2 MB RAM),
// jauh lebih hemat dari geoip-lite (~150 MB) — penting untuk VPS 1 GB.
import geoip from 'fast-geoip';

const SALT = process.env.IP_SALT || 'ganti-salt-ini';

export const sha = (s) => crypto.createHash('sha256').update(SALT + s).digest('hex').slice(0, 32);

// Crawler pratinjau link (WA, FB, Telegram, dll.) & bot umum.
// Klik dari sini tetap dicatat tapi ditandai is_bot supaya tidak menggelembungkan angka.
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|whatsapp\/|telegrambot|twitterbot|slackbot|discordbot|linkedinbot|embedly|preview|bytespider|headless|lighthouse|curl\/|wget|python-requests|axios\/|node-fetch|go-http-client|okhttp\/[0-9.]+$/i;

export const isBot = (ua = '') => !ua || BOT_RE.test(ua);

// Sumber klik. Urutan: ?src=  →  in-app browser (UA)  →  referrer  →  direct.
// In-app browser TikTok/IG/FB sering tidak mengirim referrer, jadi UA lebih bisa diandalkan.
const SOURCES = [
  ['tiktok',    /tiktok|musical_ly|bytedance/i],
  ['instagram', /instagram/i],
  ['facebook',  /fban|fbav|fb_iab|facebook|fb\.com|fb\.me/i],
  ['whatsapp',  /whatsapp|wa\.me/i],
  ['telegram',  /telegram|t\.me/i],
  ['youtube',   /youtube|youtu\.be/i],
  ['twitter',   /twitter|t\.co\b|x\.com/i],
  ['line',      /\bline\//i],
  ['google',    /google\./i],
];

const ALLOWED_SRC = /^[a-z0-9_-]{1,30}$/;

export function detectSource({ src, ua = '', referrer = '' }) {
  if (src && ALLOWED_SRC.test(src.toLowerCase())) return src.toLowerCase();
  for (const [name, re] of SOURCES) if (re.test(ua)) return name;
  if (referrer) {
    for (const [name, re] of SOURCES) if (re.test(referrer)) return name;
    return 'other';
  }
  return 'direct';
}

export async function parseVisitor(req) {
  const ua = req.get('user-agent') || '';
  const ip = req.ip || '';
  const referrer = req.get('referer') || '';
  const r = new UAParser(ua).getResult();
  const geo = await geoip.lookup(ip.replace(/^::ffff:/, '')).catch(() => null);

  return {
    ua,
    ip_hash: ip ? sha(ip) : null,
    fp: sha(ip + '|' + ua),
    device: r.device.type === 'mobile' || r.device.type === 'tablet' ? r.device.type
      : /android|ios|iphone|ipad/i.test(r.os.name || '') || /mobile/i.test(ua) ? 'mobile' : 'desktop',
    os: r.os.name || null,
    browser: r.browser.name || null,
    referrer: referrer.slice(0, 500) || null,
    source: detectSource({ src: req.query.src, ua, referrer }),
    country: geo?.country || null,
    region: geo?.region || null,
    city: geo?.city || null,
    is_bot: isBot(ua),
  };
}
