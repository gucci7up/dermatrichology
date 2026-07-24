import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { assertLengths } from '../lib/validate.js';

const router = Router();

const DEFAULT_SETTINGS = {
  app_name: 'DermaTrich',
  logo_url: '',
  logo_width: 220,
  logo_height: 100,
  doctor_name: 'Dr. Alejandro Pérez',
  doctor_profession: 'Dermatólogo-Tricólogo',
  doctor_photo_url: ''
};

const SETTINGS_COLUMNS = [
  'app_name', 'logo_url', 'logo_width', 'logo_height',
  'doctor_name', 'doctor_profession', 'doctor_photo_url'
];

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM settings LIMIT 1');
  res.json(rows[0] || DEFAULT_SETTINGS);
}));

router.put('/', asyncHandler(async (req, res) => {
  assertLengths(req.body, 8_000_000);
  const keys = SETTINGS_COLUMNS.filter((c) => req.body[c] !== undefined);
  if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' });

  const { rows } = await query('SELECT id FROM settings LIMIT 1');
  const existing = rows[0];
  const values = keys.map((k) => req.body[k]);

  if (existing) {
    const sets = keys.map((k, i) => `${k} = $${i + 2}`);
    await query(
      `UPDATE settings SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1`,
      [existing.id, ...values]
    );
  } else {
    const placeholders = keys.map((_, i) => `$${i + 1}`);
    await query(
      `INSERT INTO settings (${keys.join(', ')}, updated_at) VALUES (${placeholders.join(', ')}, NOW())`,
      values
    );
  }
  res.status(204).end();
}));

export default router;
