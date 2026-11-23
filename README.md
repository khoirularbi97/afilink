# AfiLink — Manajemen Link Afiliasi Shopee

Link pendek untuk afiliator Shopee: redirect, pelacakan per klik (unik, sumber, perangkat, kota), dashboard statistik, multi-user dengan persetujuan admin.

- `server/` — Express + PostgreSQL (Neon). Detail API & aturan pencatatan klik: [server/README.md](server/README.md)
- `client/` — React + Vite + Recharts

## Jalankan lokal
```bash
# Terminal 1 — backend
cd server && npm install && cp .env.example .env   # isi DATABASE_URL Neon dll.
npm run migrate && npm run dev                      # :4000

# Terminal 2 — frontend
cd client && npm install && npm run dev             # :5173 (proxy /api & /go ke :4000)
```
Login pakai `ADMIN_EMAIL` / `ADMIN_PASSWORD` dari `.env` server.

## Deploy
Lihat **[DEPLOY.md](DEPLOY.md)** — Neon (database), VPS + PM2 (backend), Vercel (frontend).
