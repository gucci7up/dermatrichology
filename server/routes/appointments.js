import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

const APPOINTMENT_COLUMNS = [
  'id', 'paciente_nombre', 'paciente_telefono', 'paciente_correo',
  'especialidad', 'fecha_preferida', 'hora_preferida', 'fecha_nacimiento',
  'motivo', 'estado', 'created_at'
];

router.get('/', async (req, res) => {
  const { rows } = await query('SELECT * FROM appointments ORDER BY created_at DESC');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const keys = APPOINTMENT_COLUMNS.filter((c) => req.body[c] !== undefined);
  const values = keys.map((k) => req.body[k]);
  const placeholders = keys.map((_, i) => `$${i + 1}`);
  await query(`INSERT INTO appointments (${keys.join(', ')}) VALUES (${placeholders.join(', ')})`, values);
  res.status(204).end();
});

export default router;
