# Panduan Deploy AfiLink

Susunan yang dipakai:

| Bagian | Tempat | Alamat |
|---|---|---|
| Database | Neon | — |
| Backend (API + redirect) | VPS, PM2 | `https://api-afilink.scurebot.site` |
| Link pendek (backend yang sama) | VPS, PM2 | `https://s.scurebot.site/go/<slug>` |
| Frontend | Vercel | `https://afilink.scurebot.site` |

> Frontend **wajib** memakai subdomain `*.scurebot.site`, bukan `*.vercel.app`.
> Cookie login hanya terkirim kalau frontend dan API berada di domain induk yang sama.

---

## 1. Neon (database)

1. Buka console.neon.tech → **New Project**
   - Nama: `afilink`
   - Region: **AWS Asia Pacific (Singapore)** — paling dekat ke VPS & pengguna Indonesia
2. Di **Connection Details**, aktifkan **Pooled connection**, lalu salin connection string-nya:
   ```
   postgresql://neondb_owner:xxxx@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
3. Simpan string ini untuk langkah 2 (`DATABASE_URL`). Tabel akan dibuat otomatis oleh `npm run migrate`.

## 2. DNS (di panel domain scurebot.site)

| Tipe | Nama | Nilai |
|---|---|---|
| A | `api-afilink` | IP VPS |
| A | `s` | IP VPS |
| CNAME | `afilink` | `cname.vercel-dns.com` |

## 3. Backend di VPS

```bash
# Login ke VPS
cd /var/www   # atau folder tempat backend lain disimpan
git clone https://github.com/khoirularbi97/afilink.git
cd afilink/server
npm ci --omit=dev

cp .env.example .env
nano .env
```

Isi `.env`:
```env
DATABASE_URL=<connection string Neon dari langkah 1>
JWT_SECRET=<hasil: openssl rand -hex 32>
IP_SALT=<hasil: openssl rand -hex 16>
PORT=4005                      # pilih port yang belum dipakai backend lain (cek: pm2 list / ss -tlnp)
NODE_ENV=production
CLIENT_ORIGIN=https://afilink.scurebot.site
ADMIN_NAME=Admin
ADMIN_EMAIL=<email admin>
ADMIN_PASSWORD=<password kuat>
```

```bash
npm run migrate                       # buat tabel + akun admin
# Setelah berhasil, hapus ADMIN_PASSWORD dari .env

free -m                               # pastikan sisa RAM ≥ 150 MB; kalau kurang, tambah swap dulu (lihat bawah)
pm2 start ecosystem.config.cjs
pm2 save

curl http://127.0.0.1:4005/api/health  # harus: {"ok":true}
```

### Routing domain ke port backend

Port 80/443 di VPS dipegang **nginx-proxy (Docker)**. Daftarkan `api-afilink.scurebot.site` **dan** `s.scurebot.site`
ke port backend (contoh 4005) **dengan cara yang sama seperti `api-simpuk` / `api-lembur`**, termasuk SSL dari acme-companion.

Yang perlu dipastikan pada konfigurasi proxy-nya:
- Header `X-Forwarded-For` diteruskan (nginx-proxy melakukannya secara default) — supaya IP & kota pengunjung terbaca.
- Header `X-Forwarded-Proto` diteruskan — supaya cookie `secure` berfungsi.

Uji:
```bash
curl https://api-afilink.scurebot.site/api/health
```

### Tambah swap (kalau RAM mepet)
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 4. Frontend di Vercel

1. vercel.com → **Add New → Project** → import repo `khoirularbi97/afilink`
2. **Root Directory:** `client` (Framework: Vite terdeteksi otomatis)
3. **Environment Variables:**
   ```
   VITE_API_URL=https://api-afilink.scurebot.site
   VITE_SHORT_BASE=https://s.scurebot.site
   ```
4. **Deploy**
5. **Settings → Domains** → tambah `afilink.scurebot.site` (DNS CNAME dari langkah 2)

## 5. Cek akhir

1. Buka `https://afilink.scurebot.site` → login sebagai admin
2. Daftar akun afiliator (jendela incognito) → setujui dari menu **Afiliator**
3. Login sebagai afiliator → buat link → buka `https://s.scurebot.site/go/<slug>` dari HP
4. Statistik harus menampilkan klik dengan perangkat **HP** dan kota terdeteksi

## Update aplikasi

```bash
# Backend (VPS)
cd /var/www/afilink && git pull
cd server && npm ci --omit=dev && npm run migrate && pm2 restart afilink

# Frontend: otomatis redeploy di Vercel setiap push ke main
```

## Masalah umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| Login berhasil tapi langsung keluar lagi / 401 | Frontend dibuka dari `*.vercel.app` | Pakai `afilink.scurebot.site` |
| Error CORS di console | `CLIENT_ORIGIN` tidak sama persis dengan alamat frontend | Samakan (tanpa `/` di akhir), lalu `pm2 restart afilink` |
| Semua kota "Tidak diketahui" | Proxy tidak meneruskan IP asli | Pastikan `X-Forwarded-For` diteruskan |
| Backend sering restart | RAM penuh | `pm2 monit`, tambah swap |
