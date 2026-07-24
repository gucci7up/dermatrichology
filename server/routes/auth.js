import { Router } from 'express';
import { query } from '../db.js';
import { verifyPassword, signToken, requireAuth } from '../auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { rows } = await query('SELECT * FROM profiles WHERE email = $1', [email]);
  const profile = rows[0];
  if (!profile) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const valid = await verifyPassword(password, profile.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = signToken({ id: profile.id, role: profile.role, email: profile.email });
  const { password_hash, ...safeProfile } = profile;
  res.json({ token, profile: safeProfile });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query(
    'SELECT id, email, role, full_name, updated_at FROM profiles WHERE id = $1',
    [req.user.id]
  );
  const profile = rows[0];
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json({ profile });
});

export default router;
