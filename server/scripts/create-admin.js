import 'dotenv/config';
import crypto from 'node:crypto';
import { query, pool } from '../db.js';
import { hashPassword } from '../auth.js';

const [, , email, password, fullName] = process.argv;

if (!email || !password || !fullName) {
  console.error('Usage: node server/scripts/create-admin.js <email> <password> "<full name>"');
  process.exit(1);
}

const run = async () => {
  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO profiles (id, email, password_hash, role, full_name)
     VALUES ($1, $2, $3, 'admin', $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name`,
    [id, email, passwordHash, fullName]
  );
  console.log(`Admin profile ready for ${email}`);
  await pool.end();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
