import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { parse, registerSchema, loginSchema } from '../lib/validate.js';
import { sign, COOKIE, cookieOpts, requireAuth } from '../middleware/auth.js';

const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

// Pendaftaran terbuka, tapi akun baru berstatus "pending" sampai di-approve admin.
r.post('/register', limiter, async (req, res, next) => {
  const data = parse(registerSchema, req.body, res); if (!data) return;
  try {
    const hash = await bcrypt.hash(data.password, 10);
    await query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)`,
      [data.name, data.email, hash],
    );
    res.status(201).json({ message: 'Pendaftaran berhasil. Tunggu persetujuan admin.' });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email sudah terdaftar' });
    next(e);
  }
});

r.post('/login', limiter, async (req, res, next) => {
  const data = parse(loginSchema, req.body, res); if (!data) return;
  try {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [data.email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }
    if (user.status === 'pending') return res.status(403).json({ error: 'Akun belum disetujui admin' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Akun dinonaktifkan' });

    const token = sign(user);
    res.cookie(COOKIE, token, cookieOpts);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (e) { next(e); }
});

r.post('/logout', (req, res) => {
  res.clearCookie(COOKIE, { ...cookieOpts, maxAge: undefined });
  res.json({ ok: true });
});

r.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

export default r;
