import { z } from 'zod';

// Hanya domain Shopee yang boleh jadi tujuan. Karena sistem dibuka untuk banyak
// afiliator, ini mencegah domain kita dipakai untuk mengarahkan ke situs phishing/scam.
const SHOPEE_HOSTS = [
  /(^|\.)shopee\.co\.id$/i,
  /(^|\.)shopee\.com$/i,
  /^shope\.ee$/i,
  /(^|\.)shp\.ee$/i,
];

export const isShopeeUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && SHOPEE_HOSTS.some((re) => re.test(u.hostname));
  } catch { return false; }
};

const RESERVED = new Set(['api', 'go', 'admin', 'login', 'register', 'dashboard', 'static', 'assets']);

export const slugSchema = z.string().trim().toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{2,49}$/, 'Slug 3–50 karakter: huruf kecil, angka, tanda -')
  .refine((s) => !RESERVED.has(s), 'Slug ini dipakai sistem');

export const linkCreateSchema = z.object({
  target_url: z.string().trim().url().refine(isShopeeUrl, 'Harus link https Shopee (shopee.co.id, s.shopee.co.id, shope.ee, id.shp.ee)'),
  slug: slugSchema.optional(),
  title: z.string().trim().max(120).optional(),
  campaign: z.string().trim().max(60).optional(),
});

export const linkUpdateSchema = linkCreateSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password minimal 8 karakter').max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// Helper: validasi body, kirim 400 dengan pesan rapi kalau gagal.
export const parse = (schema, data, res) => {
  const r = schema.safeParse(data);
  if (!r.success) {
    res.status(400).json({ error: 'Validasi gagal', fields: r.error.flatten().fieldErrors });
    return null;
  }
  return r.data;
};
