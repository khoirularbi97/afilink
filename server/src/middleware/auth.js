import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET belum di-set');

export const COOKIE = 'token';
export const sign = (user) => jwt.sign({ uid: user.id }, SECRET, { expiresIn: '7d' });

export const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 3600 * 1000,
};

// Ambil token dari cookie httpOnly atau header Authorization: Bearer
export async function requireAuth(req, res, next) {
  const header = req.get('authorization');
  const token = req.cookies?.[COOKIE] || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) return res.status(401).json({ error: 'Belum login' });

  try {
    const { uid } = jwt.verify(token, SECRET);
    // Cek ulang ke DB supaya user yang di-suspend langsung kehilangan akses.
    const { rows } = await query('SELECT id, name, email, role, status FROM users WHERE id = $1', [uid]);
    const user = rows[0];
    if (!user || user.status !== 'active') return res.status(403).json({ error: 'Akun tidak aktif' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Sesi tidak valid, silakan login ulang' });
  }
}

export const requireAdmin = (req, res, next) =>
  req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Khusus admin' });
