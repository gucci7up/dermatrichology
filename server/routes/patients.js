import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { assertLengths } from '../lib/validate.js';
import { requireRole } from '../lib/requireRole.js';

const router = Router();

// The assistant only needs to read the patient list to book appointments;
// creating and editing clinical records stays with admin and doctor.
const canRead = requireRole('admin', 'doctor', 'assistant');
const canWrite = requireRole('admin', 'doctor');

const PATIENT_COLUMNS = [
  'id', 'nombre_completo', 'fecha_nacimiento', 'sexo', 'telefono', 'correo',
  'direccion', 'documento_identidad', 'contacto_emergencia', 'foto_perfil',
  'ocupacion', 'created_at'
];

router.get('/', canRead, asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM patients ORDER BY created_at DESC');
  res.json(rows);
}));

router.get('/:id', canRead, asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
}));

router.post('/', canWrite, asyncHandler(async (req, res) => {
  assertLengths(req.body, 8_000_000);
  const keys = PATIENT_COLUMNS.filter((c) => req.body[c] !== undefined);
  const values = keys.map((k) => req.body[k]);
  const placeholders = keys.map((_, i) => `$${i + 1}`);
  const updates = keys.filter((k) => k !== 'id').map((k) => `${k} = EXCLUDED.${k}`);

  const sql = `
    INSERT INTO patients (${keys.join(', ')})
    VALUES (${placeholders.join(', ')})
    ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}
  `;
  await query(sql, values);
  res.status(204).end();
}));

router.patch('/:id', canWrite, asyncHandler(async (req, res) => {
  assertLengths(req.body, 8_000_000);
  const keys = PATIENT_COLUMNS.filter((c) => c !== 'id' && req.body[c] !== undefined);
  if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' });
  const sets = keys.map((k, i) => `${k} = $${i + 2}`);
  const values = keys.map((k) => req.body[k]);
  await query(`UPDATE patients SET ${sets.join(', ')} WHERE id = $1`, [req.params.id, ...values]);
  res.status(204).end();
}));

router.delete('/:id', canWrite, asyncHandler(async (req, res) => {
  await query('DELETE FROM patients WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

export default router;
