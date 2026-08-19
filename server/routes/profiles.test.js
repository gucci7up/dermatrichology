// Self-check for the profiles (user management) routes. Runs without a database:
// `../db.js` is mocked with an in-memory table.
//
//   node --experimental-test-module-mocks --test server/routes/profiles.test.js

import { test, mock, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.JWT_SECRET = 'test-secret-for-profiles-selfcheck';

let rows = [];

// Minimal stand-in for the handful of statements the router issues.
const query = async (text, params = []) => {
  const sql = text.replace(/\s+/g, ' ').trim();

  if (sql.startsWith('SELECT id, email, role, full_name, updated_at FROM profiles ORDER BY')) {
    return { rows: [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name)).map(safe) };
  }
  if (sql.startsWith('SELECT id FROM profiles WHERE email')) {
    return { rows: rows.filter((r) => r.email === params[0]).map(({ id }) => ({ id })) };
  }
  if (sql.startsWith('SELECT id, role FROM profiles WHERE id')) {
    return { rows: rows.filter((r) => r.id === params[0]).map(({ id, role }) => ({ id, role })) };
  }
  if (sql.startsWith('SELECT id, email, role, full_name, updated_at FROM profiles WHERE id')) {
    return { rows: rows.filter((r) => r.id === params[0]).map(safe) };
  }
  if (sql.startsWith('INSERT INTO profiles')) {
    const [id, email, password_hash, role, full_name] = params;
    const row = { id, email, password_hash, role, full_name, updated_at: new Date().toISOString() };
    rows.push(row);
    return { rows: [safe(row)] };
  }
  if (sql.startsWith('UPDATE profiles SET')) {
    const row = rows.find((r) => r.id === params[0]);
    const columns = [...sql.matchAll(/(\w+) = \$(\d+)/g)]
      .filter(([, , idx]) => Number(idx) > 1)
      .map(([, column, idx]) => [column, params[Number(idx) - 1]]);
    for (const [column, value] of columns) row[column] = value;
    return { rows: [safe(row)] };
  }
  if (sql.startsWith('DELETE FROM profiles')) {
    const before = rows.length;
    rows = rows.filter((r) => r.id !== params[0]);
    return { rowCount: before - rows.length, rows: [] };
  }
  throw new Error(`Unexpected SQL in test double: ${sql}`);
};

const safe = ({ password_hash, ...rest }) => rest;

mock.module('../db.js', { exports: { query, pool: { end: async () => {} } } });

const { default: express } = await import('express');
const { default: profilesRoutes } = await import('./profiles.js');
const { verifyPassword } = await import('../auth.js');

const ADMIN_ID = crypto.randomUUID();
let currentUser = { id: ADMIN_ID, role: 'admin', email: 'admin@test.local' };
let server;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = currentUser; next(); });
  app.use('/api/profiles', profilesRoutes);
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message }));

  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}/api/profiles`;

  rows = [{
    id: ADMIN_ID,
    email: 'admin@test.local',
    password_hash: 'x',
    role: 'admin',
    full_name: 'Admin Root',
    updated_at: new Date().toISOString(),
  }];
});

after(() => server?.close());

const call = (path = '', options = {}) => fetch(`${base}${path}`, {
  headers: { 'Content-Type': 'application/json' },
  ...options,
}).then(async (res) => ({ status: res.status, body: res.status === 204 ? null : await res.json() }));

test('admin creates a user and the password is stored hashed', async () => {
  const { status, body } = await call('', {
    method: 'POST',
    body: JSON.stringify({ email: 'Ana@Clinica.com', password: 'super-secreta', role: 'doctor', full_name: '  Dra. Ana  ' }),
  });

  assert.equal(status, 201);
  assert.equal(body.email, 'ana@clinica.com', 'email is normalised to lowercase');
  assert.equal(body.full_name, 'Dra. Ana', 'name is trimmed');
  assert.equal(body.role, 'doctor');
  assert.equal(body.password_hash, undefined, 'hash must never leave the API');

  const stored = rows.find((r) => r.id === body.id);
  assert.notEqual(stored.password_hash, 'super-secreta', 'password must not be stored in clear text');
  assert.equal(await verifyPassword('super-secreta', stored.password_hash), true);
});

test('duplicate email is rejected', async () => {
  const { status } = await call('', {
    method: 'POST',
    body: JSON.stringify({ email: 'ana@clinica.com', password: 'otra-password', role: 'assistant', full_name: 'Ana Dup' }),
  });
  assert.equal(status, 409);
});

test('invalid payloads are rejected', async () => {
  const cases = [
    { email: 'no-arroba', password: 'super-secreta', role: 'doctor', full_name: 'X' },
    { email: 'b@c.com', password: 'corta', role: 'doctor', full_name: 'X' },
    { email: 'b@c.com', password: 'super-secreta', role: 'superuser', full_name: 'X' },
    { email: 'b@c.com', password: 'super-secreta', role: 'doctor', full_name: '   ' },
  ];
  for (const payload of cases) {
    const { status } = await call('', { method: 'POST', body: JSON.stringify(payload) });
    assert.equal(status, 400, `expected 400 for ${JSON.stringify(payload)}`);
  }
});

test('non-admins cannot list or create users', async () => {
  currentUser = { id: crypto.randomUUID(), role: 'doctor', email: 'doc@test.local' };
  assert.equal((await call('')).status, 403);
  assert.equal((await call('', {
    method: 'POST',
    body: JSON.stringify({ email: 'x@y.com', password: 'super-secreta', role: 'admin', full_name: 'X' }),
  })).status, 403);
  currentUser = { id: ADMIN_ID, role: 'admin', email: 'admin@test.local' };
});

test('admin resets a password and changes a role', async () => {
  const target = rows.find((r) => r.email === 'ana@clinica.com');

  const reset = await call(`/${target.id}`, { method: 'PATCH', body: JSON.stringify({ password: 'nueva-password' }) });
  assert.equal(reset.status, 200);
  assert.equal(await verifyPassword('nueva-password', rows.find((r) => r.id === target.id).password_hash), true);

  const promoted = await call(`/${target.id}`, { method: 'PATCH', body: JSON.stringify({ role: 'admin' }) });
  assert.equal(promoted.status, 200);
  assert.equal(promoted.body.role, 'admin');
});

test('an admin cannot demote or delete themselves', async () => {
  assert.equal((await call(`/${ADMIN_ID}`, { method: 'PATCH', body: JSON.stringify({ role: 'doctor' }) })).status, 400);
  assert.equal((await call(`/${ADMIN_ID}`, { method: 'DELETE' })).status, 400);
});

test('admin deletes another user', async () => {
  const target = rows.find((r) => r.email === 'ana@clinica.com');
  assert.equal((await call(`/${target.id}`, { method: 'DELETE' })).status, 204);
  assert.equal(rows.some((r) => r.id === target.id), false);
  assert.equal((await call(`/${target.id}`, { method: 'DELETE' })).status, 404);
});

test('listing returns every user without password hashes', async () => {
  const { status, body } = await call('');
  assert.equal(status, 200);
  assert.ok(body.length >= 1);
  for (const user of body) assert.equal(user.password_hash, undefined);
});
