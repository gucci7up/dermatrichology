import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { assertLengths } from '../lib/validate.js';
import { requireRole } from '../lib/requireRole.js';

const router = Router();

// Scheduling is shared by every staff role, including the assistant.
const staffOnly = requireRole('admin', 'doctor', 'assistant');

const APPOINTMENT_COLUMNS = [
  'id', 'paciente_nombre', 'paciente_telefono', 'paciente_correo', 'paciente_cedula',
  'especialidad', 'fecha_preferida', 'hora_preferida', 'fecha_nacimiento',
  'motivo', 'con_seguro', 'estado', 'created_at'
];

router.get('/', staffOnly, asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM appointments ORDER BY created_at DESC');
  res.json(rows);
}));

router.post('/', staffOnly, asyncHandler(async (req, res) => {
  assertLengths(req.body);
  const keys = APPOINTMENT_COLUMNS.filter((c) => req.body[c] !== undefined);
  const values = keys.map((k) => req.body[k]);
  const placeholders = keys.map((_, i) => `$${i + 1}`);
  await query(`INSERT INTO appointments (${keys.join(', ')}) VALUES (${placeholders.join(', ')})`, values);
  res.status(204).end();
}));

router.patch('/:id', staffOnly, asyncHandler(async (req, res) => {
  assertLengths(req.body);
  const keys = APPOINTMENT_COLUMNS.filter((c) => c !== 'id' && req.body[c] !== undefined);
  if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' });
  const sets = keys.map((k, i) => `${k} = $${i + 2}`);
  const values = keys.map((k) => req.body[k]);
  await query(`UPDATE appointments SET ${sets.join(', ')} WHERE id = $1`, [req.params.id, ...values]);
  res.status(204).end();
}));

export default router;
