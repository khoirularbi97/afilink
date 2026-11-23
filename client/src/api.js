// Base URL API. Kosong = origin yang sama (dev pakai proxy Vite, produksi pakai Nginx).
const BASE = import.meta.env.VITE_API_URL || '';

// Domain link pendek yang dibagikan ke pembeli, mis. https://scurebot.site
export const SHORT_BASE = (import.meta.env.VITE_SHORT_BASE || window.location.origin).replace(/\/$/, '');
export const shortUrl = (slug) => `${SHORT_BASE}/go/${slug}`;

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
