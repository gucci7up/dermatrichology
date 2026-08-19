// Role matrix for every API surface. Runs without a database: `../db.js` is
// mocked, so the assertions are purely about who gets a 403 and who does not.
//
//   npm test

import { test, mock, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'test-secret-for-roles-selfcheck';

mock.module('../db.js', {
  exports: {
    query: async () => ({ rows: [], rowCount: 0 }),
    pool: { end: async () => {} },
  },
});

const { default: express } = await import('express');
const { default: patientsRoutes } = await import('./patients.js');
const { default: appointmentsRoutes } = await import('./appointments.js');
const { default: settingsRoutes } = await import('./settings.js');
const { default: profilesRoutes } = await import('./profiles.js');
const { default: clinicalRoutes } = await import('./clinical.js');

let currentRole = 'admin';
let server;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = { id: 'test-user', role: currentRole }; next(); });
  app.use('/api/patients', patientsRoutes);
  app.use('/api/appointments', appointmentsRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/profiles', profilesRoutes);
  app.use('/api', clinicalRoutes);
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message }));

  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

const status = async (role, method, path) => {
  currentRole = role;
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'GET' || method === 'DELETE' ? undefined : '{}',
  });
  return res.status;
};

// [method, path, roles allowed through the guard]
const MATRIX = [
  ['GET', '/api/patients', ['admin', 'doctor', 'assistant']],
  ['GET', '/api/patients/abc', ['admin', 'doctor', 'assistant']],
  ['POST', '/api/patients', ['admin', 'doctor']],
  ['PATCH', '/api/patients/abc', ['admin', 'doctor']],
  ['DELETE', '/api/patients/abc', ['admin', 'doctor']],

  ['GET', '/api/appointments', ['admin', 'doctor', 'assistant']],
  ['POST', '/api/appointments', ['admin', 'doctor', 'assistant']],
  ['PATCH', '/api/appointments/abc', ['admin', 'doctor', 'assistant']],

  ['GET', '/api/settings', ['admin', 'doctor', 'assistant']],
  ['PUT', '/api/settings', ['admin']],

  ['GET', '/api/profiles', ['admin']],
  ['POST', '/api/profiles', ['admin']],
  ['PATCH', '/api/profiles/abc', ['admin']],
  ['DELETE', '/api/profiles/abc', ['admin']],

  ['GET', '/api/derm-histories?paciente_id=1', ['admin', 'doctor']],
  ['POST', '/api/derm-histories', ['admin', 'doctor']],
  ['GET', '/api/trich-histories?paciente_id=1', ['admin', 'doctor']],
  ['GET', '/api/sessions?paciente_id=1', ['admin', 'doctor']],
  ['GET', '/api/labs?paciente_id=1', ['admin', 'doctor']],
  ['GET', '/api/treatments?paciente_id=1', ['admin', 'doctor']],
  ['GET', '/api/prescriptions?paciente_id=1', ['admin', 'doctor']],
  ['DELETE', '/api/prescriptions/abc', ['admin', 'doctor']],
];

const ROLES = ['admin', 'doctor', 'assistant'];

for (const [method, path, allowed] of MATRIX) {
  test(`${method} ${path} — allowed for ${allowed.join(', ')}`, async () => {
    for (const role of ROLES) {
      const code = await status(role, method, path);
      if (allowed.includes(role)) {
        assert.notEqual(code, 403, `${role} should reach ${method} ${path}`);
      } else {
        assert.equal(code, 403, `${role} must be blocked from ${method} ${path}`);
      }
    }
  });
}

test('a request with no role is rejected everywhere', async () => {
  for (const [method, path] of MATRIX) {
    const code = await status(undefined, method, path);
    assert.equal(code, 403, `unknown role must be blocked from ${method} ${path}`);
  }
});
