const nf = new Intl.NumberFormat('id-ID');
export const num = (n) => nf.format(n ?? 0);

export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export const dateShort = (iso) =>
  new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

export const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// Tanggal hari ini (WIB) format YYYY-MM-DD
export const todayWIB = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
export const daysAgo = (n) => {
  const d = new Date(todayWIB() + 'T00:00:00');
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('sv-SE');
};

export const SOURCE_LABEL = {
  tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp',
  telegram: 'Telegram', youtube: 'YouTube', twitter: 'X / Twitter', line: 'LINE',
  google: 'Google', direct: 'Langsung', other: 'Lainnya', unknown: 'Tidak diketahui',
};
export const DEVICE_LABEL = { mobile: 'HP', tablet: 'Tablet', desktop: 'Komputer', unknown: 'Tidak diketahui' };
export const label = (map, k) => map[k] || k;
