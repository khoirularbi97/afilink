# Afiliasi Link Manager — Backend

Express + PostgreSQL (Neon). Multi-user: afiliator daftar → admin approve → kelola link & lihat statistik.

## Setup
```bash
npm install
cp .env.example .env     # isi DATABASE_URL Neon, JWT_SECRET, IP_SALT, ADMIN_*
npm run migrate          # buat tabel + admin pertama
npm run dev              # http://localhost:4000
```

## Endpoint
| Method | Path | Keterangan |
|---|---|---|
| GET | `/go/:slug` | Redirect ke Shopee + catat klik (`?src=tiktok` untuk tag sumber manual) |
| POST | `/api/auth/register` | Daftar (status pending) |
| POST | `/api/auth/login` | Login → cookie httpOnly `token` (+ token di body) |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | User aktif |
| GET/POST | `/api/links` | Daftar link milik sendiri (+ total klik) / buat link |
| PATCH/DELETE | `/api/links/:id` | Edit (termasuk `is_active`) / hapus |
| GET | `/api/stats/overview?from=&to=&link_id=` | Total, harian, top link, sumber, perangkat, kota |
| GET | `/api/stats/recent` | 50 klik terbaru |
| GET | `/api/admin/users` | Admin: semua user |
| PATCH | `/api/admin/users/:id/status` | Admin: `active` / `suspended` / `pending` |

## Aturan pencatatan
- **Klik unik**: belum ada klik dari cookie `vid` *atau* fingerprint (hash IP+UA) yang sama ke link itu dalam 24 jam.
- **Bot** (crawler pratinjau WA/FB/Telegram, curl, dll.) dicatat terpisah (`is_bot`), tidak masuk angka utama.
- **Sumber**: `?src=` → in-app browser (TikTok/IG/FB dari user-agent) → referrer → `direct`.
- IP tidak disimpan mentah, hanya hash bergaram (`IP_SALT`).
- Tujuan link hanya domain Shopee (https), supaya domain tidak disalahgunakan untuk phishing.

## Deploy
Lihat [DEPLOY.md](../DEPLOY.md) di root repo.
