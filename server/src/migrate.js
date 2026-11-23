// Jalankan: npm run migrate
// Opsional buat admin pertama: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME di .env
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(dir, '..', 'sql', 'schema.sql'), 'utf8');

await pool.query(sql);
console.log('✔ Skema siap');

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Admin' } = process.env;
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, status)
     VALUES ($1, lower($2), $3, 'admin', 'active')
     ON CONFLICT (email) DO NOTHING`,
    [ADMIN_NAME, ADMIN_EMAIL, hash],
  );
  console.log(`✔ Admin ${ADMIN_EMAIL} siap`);
}

await pool.end();
