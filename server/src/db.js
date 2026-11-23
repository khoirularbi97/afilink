import pg from 'pg';
import 'dotenv/config';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL belum di-set (lihat .env.example)');

// Neon butuh SSL; Postgres lokal tidak.
const isLocal = /localhost|127\.0\.0\.1|\/var\/run/.test(url);

export const pool = new pg.Pool({
  connectionString: url,
  ssl: isLocal ? false : { rejectUnauthorized: true },
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => console.error('[db] idle client error:', err.message));

export const query = (text, params) => pool.query(text, params);
