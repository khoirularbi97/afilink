import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { goRedirect, rootRedirect } from './routes/redirect.js';
import auth from './routes/auth.js';
import links from './routes/links.js';
import stats from './routes/stats.js';
import admin from './routes/admin.js';

export const app = express();

// Di belakang Nginx di VPS: supaya req.ip = IP asli pengunjung (X-Forwarded-For).
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));

// Redirect bentuk panjang (/go/:slug) ditaruh paling depan, tanpa CORS.
app.use(goRedirect);

app.use('/api', cors({
  origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(','),
  credentials: true,
}));

// Statistik harus selalu terbaru: larang browser/proxy menyimpan respons API.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', auth);
app.use('/api/links', links);
app.use('/api/stats', stats);
app.use('/api/admin', admin);

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ada' }));

// Redirect bentuk pendek (/:slug) dipasang PALING AKHIR, sesudah /api & /go,
// supaya hanya menangkap slug dan tidak pernah menelan rute lain.
app.use(rootRedirect);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan server' });
});
