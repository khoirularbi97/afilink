// Cache slug di memori supaya redirect tidak selalu menunggu database
// (penting karena Neon bisa cold start).
const TTL = 60_000;
const store = new Map();

export const cache = {
  get(slug) {
    const hit = store.get(slug);
    if (!hit) return undefined;
    if (Date.now() > hit.exp) { store.delete(slug); return undefined; }
    return hit.value;
  },
  set(slug, value) { store.set(slug, { value, exp: Date.now() + TTL }); },
  del(slug) { store.delete(slug); },
  clear() { store.clear(); },
};
