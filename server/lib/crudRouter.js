import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from './asyncHandler.js';
import { assertLengths } from './validate.js';

const toParam = (value) => (value !== null && typeof value === 'object') ? JSON.stringify(value) : value;

export const createClinicalRouter = ({ path, table, columns, orderColumn, allowUpdate = false, allowDelete = false, maxBodyChars = 8_000_000 }) => {
  const router = Router();

  router.get(`/${path}`, asyncHandler(async (req, res) => {
    const { paciente_id } = req.query;
    if (!paciente_id) return res.status(400).json({ error: 'paciente_id query param is required' });
    const orderClause = orderColumn ? ` ORDER BY ${orderColumn} DESC` : '';
    const { rows } = await query(
      `SELECT * FROM ${table} WHERE paciente_id = $1${orderClause}`,
      [paciente_id]
    );
    res.json(rows);
  }));

  router.post(`/${path}`, asyncHandler(async (req, res) => {
    assertLengths(req.body, maxBodyChars);
    const keys = columns.filter((c) => req.body[c] !== undefined);
    const values = keys.map((k) => toParam(req.body[k]));
    const placeholders = keys.map((_, i) => `$${i + 1}`);
    await query(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')})`, values);
    res.status(204).end();
  }));

  if (allowUpdate) {
    router.patch(`/${path}/:id`, asyncHandler(async (req, res) => {
      assertLengths(req.body, maxBodyChars);
      const keys = columns.filter((c) => c !== 'id' && req.body[c] !== undefined);
      if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' });
      const sets = keys.map((k, i) => `${k} = $${i + 2}`);
      const values = keys.map((k) => toParam(req.body[k]));
      await query(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = $1`, [req.params.id, ...values]);
      res.status(204).end();
    }));
  }

  if (allowDelete) {
    router.delete(`/${path}/:id`, asyncHandler(async (req, res) => {
      await query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
      res.status(204).end();
    }));
  }

  return router;
};
