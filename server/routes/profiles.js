import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/:id', async (req, res) => {
  const { rows } = await query(
    'SELECT id, email, role, full_name, updated_at FROM profiles WHERE id = $1',
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

export default router;
