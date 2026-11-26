// Base URL API. Kosong = origin yang sama (dev pakai proxy Vite, produksi pakai Nginx).
const BASE = import.meta.env.VITE_API_URL || '';

// Domain link pendek yang dibagikan ke pembeli, mis. https://s.scurebot.site
export const SHORT_BASE = (import.meta.env.VITE_SHORT_BASE || window.location.origin).replace(/\/$/, '');
// Awalan path. Di domain pendek khusus set VITE_SHORT_PREFIX=/ supaya link jadi
// s.scurebot.site/slug. Default /go/ aman kalau link pendek berbagi domain dengan aplikasi.
const SHORT_PREFIX = (import.meta.env.VITE_SHORT_PREFIX || '/go/').replace(/^\/?/, '/').replace(/\/?$/, '/');
export const shortUrl = (slug) => `${SHORT_BASE}${SHORT_PREFIX}${slug}`;

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request(method, path, body) {
  const res = await fetch(BASE + '/api' + path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fieldMsg = data.fields && Object.values(data.fields).flat()[0];
    throw new ApiError(fieldMsg || data.error || `Error ${res.status}`, res.status, data.fields);
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b ?? {}),
  patch: (p, b) => request('PATCH', p, b),
  del: (p) => request('DELETE', p),
};
