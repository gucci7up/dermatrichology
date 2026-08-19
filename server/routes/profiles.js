import { Router } from 'express';
import crypto from 'node:crypto';
import { query } from '../db.js';
import { hashPassword } from '../auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireRole } from '../lib/requireRole.js';

const router = Router();

const SAFE_COLUMNS = 'id, email, role, full_name, updated_at';
const ROLES = ['admin', 'doctor', 'assistant'];
const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const adminOnly = requireRole('admin');

router.get('/', adminOnly, asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT ${SAFE_COLUMNS} FROM profiles ORDER BY full_name ASC`);
  res.json(rows);
}));

router.post('/', adminOnly, asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const { password, role } = req.body;
  const fullName = String(req.body.full_name || '').trim();

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  if (!fullName) {
    return res.status(400).json({ error: 'El nombre completo es obligatorio' });
  }

  const { rows: existing } = await query('SELECT id FROM profiles WHERE email = $1', [email]);
  if (existing[0]) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
  }

  const passwordHash = await hashPassword(password);
  const { rows } = await query(
    `INSERT INTO profiles (id, email, password_hash, role, full_name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${SAFE_COLUMNS}`,
    [crypto.randomUUID(), email, passwordHash, role, fullName]
  );
  res.status(201).json(rows[0]);
}));

router.patch('/:id', adminOnly, asyncHandler(async (req, res) => {
  const { rows: target } = await query('SELECT id, role FROM profiles WHERE id = $1', [req.params.id]);
  if (!target[0]) return res.status(404).json({ error: 'Not found' });

  const sets = [];
  const values = [];
  const push = (column, value) => {
    values.push(value);
    sets.push(`${column} = $${values.length + 1}`);
  };

  if (req.body.full_name !== undefined) {
    const fullName = String(req.body.full_name).trim();
    if (!fullName) return res.status(400).json({ error: 'El nombre completo es obligatorio' });
    push('full_name', fullName);
  }

  if (req.body.role !== undefined) {
    if (!ROLES.includes(req.body.role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    // Never let an admin demote themselves out of the only admin-capable seat.
    if (req.params.id === req.user.id && req.body.role !== 'admin') {
      return res.status(400).json({ error: 'No puede cambiar su propio rol' });
    }
    push('role', req.body.role);
  }

  if (req.body.password !== undefined) {
    if (typeof req.body.password !== 'string' || req.body.password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
    }
    push('password_hash', await hashPassword(req.body.password));
  }

  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

  const { rows } = await query(
    `UPDATE profiles SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING ${SAFE_COLUMNS}`,
    [req.params.id, ...values]
  );
  res.json(rows[0]);
}));

router.delete('/:id', adminOnly, asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'No puede eliminar su propio usuario' });
  }
  const { rowCount } = await query('DELETE FROM profiles WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT ${SAFE_COLUMNS} FROM profiles WHERE id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
}));

export default router;
