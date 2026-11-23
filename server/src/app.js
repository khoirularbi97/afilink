import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import redirect from './routes/redirect.js';
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

// Redirect ditaruh paling depan, tanpa CORS.
app.use(redirect);

app.use('/api', cors({
  origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(','),
  credentials: true,
}));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', auth);
app.use('/api/links', links);
app.use('/api/stats', stats);
app.use('/api/admin', admin);

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan server' });
});
