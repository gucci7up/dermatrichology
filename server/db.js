import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL env var is required');
}

export const pool = new Pool({ connectionString: DATABASE_URL });

export const query = (text, params) => pool.query(text, params);
