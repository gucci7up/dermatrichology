# Supabase → Dokploy Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all Supabase dependencies (DB + Auth) from `dermatrichology-hub` and replace them with a self-owned Node/Express + Postgres stack, deployed as a single Node service on Dokploy.

**Architecture:** A new `server/` Express app (plain JS, ES modules — matches the repo's existing `"type": "module"`) sits between the React/Vite frontend and Postgres. The frontend keeps its exact `DB.*` call surface (`services/db.ts`) but that module now calls the Express API over `fetch` instead of `supabase-js`. Auth becomes JWT + bcrypt against a `profiles` table (which now also stores `password_hash`). In production, the same Node process serves both the Express API (`/api/*`) and the built Vite static assets (`dist/`) — one Dokploy service, one deploy.

**Tech Stack:** Node.js (Express, plain JS/ESM, no TS build step for the backend), `pg` (raw SQL, no ORM), `jsonwebtoken`, `bcryptjs`, Postgres (self-hosted on Dokploy). Frontend stack (React 19, Vite, TypeScript) unchanged.

## Global Constraints

- No ORM — all DB access via raw `pg` queries with parameterized values. (spec: "10 tablas, CRUD simple, ORM sería sobre-ingeniería")
- Backend written in plain JavaScript ESM under `server/` — no separate TypeScript build step for the server.
- Auth: JWT + bcrypt (`bcryptjs`, pure JS, no native bindings) against a `profiles` table. No third-party auth provider.
- Single Node service serves the API and the built frontend together — one Dokploy deploy, no separate frontend/backend services.
- No file storage / upload system is in scope — none exists today (`foto_perfil` is a placeholder URL, not a real upload).
- Out of scope: any feature or UI change. This plan only replaces the data/auth layer.
- Every SQL identifier (table/column name) interpolated into a query string must come from a fixed, developer-defined list — never from raw request-body keys (prevents SQL-injection via arbitrary JSON keys).
- Any value written to a `JSONB` column must be `JSON.stringify`'d before being passed to `pg` — `pg` does not do this automatically, and skipping it silently corrupts the column (stores `"[object Object]"`).
- Verification happens twice per the user's explicit request: an automated smoke-test script (Task 14) exercising every endpoint end-to-end, and a full manual walkthrough of the running app (Task 15) before the migration is considered done.
- Requires a live Postgres instance reachable via `DATABASE_URL` for every task from Task 1 onward — this is real infrastructure work, it cannot be fully mocked. The person executing this plan needs the Dokploy Postgres connection string in hand.

---

## Task 1: Database schema

**Files:**
- Create: `schema.sql`

**Interfaces:**
- Produces: 9 tables (`patients`, `appointments`, `derm_histories`, `trich_histories`, `sessions`, `labs`, `treatments`, `prescriptions`, `settings`) + `profiles` (auth), all in the default `public` schema, no RLS. All later tasks query these tables by these exact names/columns.

- [ ] **Step 1: Write `schema.sql`**

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS patients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_completo TEXT NOT NULL,
    fecha_nacimiento DATE,
    sexo TEXT CHECK (sexo IN ('M', 'F', 'O')),
    telefono TEXT,
    correo TEXT,
    direccion TEXT,
    documento_identidad TEXT,
    contacto_emergencia TEXT,
    foto_perfil TEXT,
    ocupacion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_nombre TEXT NOT NULL,
    paciente_telefono TEXT,
    paciente_correo TEXT,
    especialidad TEXT CHECK (especialidad IN ('derm', 'trich')),
    fecha_preferida DATE,
    hora_preferida TEXT,
    fecha_nacimiento DATE,
    motivo TEXT,
    estado TEXT CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')) DEFAULT 'pendiente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS derm_histories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    motivo_consulta TEXT,
    antecedentes_personales_patologicos TEXT,
    antecedentes_familiares TEXT,
    alergias TEXT,
    medicamentos_actuales TEXT,
    habitos JSONB,
    tipo_piel_fitzpatrick INTEGER,
    historia_enfermedad TEXT,
    diagnosticos TEXT,
    evolucion_clinica TEXT,
    observaciones TEXT,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trich_histories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    motivo_consulta TEXT,
    antecedentes_familiares TEXT,
    enfermedades_hormonales TEXT,
    deficits_nutricionales TEXT,
    estres TEXT,
    cirugias TEXT,
    infecciones TEXT,
    covid BOOLEAN,
    medicamentos TEXT,
    inicio_caida TEXT,
    duracion TEXT,
    patron_caida TEXT,
    cantidad_diaria TEXT,
    factores_desencadenantes TEXT,
    estacionalidad TEXT,
    progresion TEXT,
    examen_fisico JSONB,
    tricoscopia JSONB,
    escalas JSONB,
    diagnostico_estructurado JSONB,
    plan_tratamiento JSONB,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    evolucion_clinica TEXT,
    fotos_comparativas JSONB,
    cambios_densidad NUMERIC(5,2),
    respuesta_tratamiento TEXT,
    ajustes_terapeuticos TEXT
);

CREATE TABLE IF NOT EXISTS labs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    analisis TEXT,
    resultados TEXT,
    interpretacion TEXT
);

CREATE TABLE IF NOT EXISTS treatments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    tratamiento_topico TEXT,
    tratamiento_oral TEXT,
    procedimientos TEXT,
    notas_adicionales TEXT
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    contenido TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    app_name TEXT,
    logo_url TEXT,
    logo_width INTEGER,
    logo_height INTEGER,
    doctor_name TEXT,
    doctor_profession TEXT,
    doctor_photo_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'doctor', 'assistant')) NOT NULL,
    full_name TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Apply it to the real Dokploy Postgres and verify**

```bash
psql "$DATABASE_URL" -f schema.sql
psql "$DATABASE_URL" -c "\dt"
```

Expected: 10 rows listed (`patients`, `appointments`, `derm_histories`, `trich_histories`, `sessions`, `labs`, `treatments`, `prescriptions`, `settings`, `profiles`).

- [ ] **Step 3: Commit**

```bash
git add schema.sql
git commit -m "feat: add Postgres schema for Dokploy migration"
```

---

## Task 2: Backend scaffold (Express + pg + health check)

**Files:**
- Create: `server/db.js`
- Create: `server/index.js`
- Modify: `package.json` (dependencies + scripts)
- Modify: `vite.config.ts:8-11` (dev proxy)
- Create: `.env.example`

**Interfaces:**
- Produces: `query(text, params)` from `server/db.js` — used by every route file from Task 4 onward. `GET /api/health` → `{ ok: true }`.

- [ ] **Step 1: Add backend dependencies and scripts to `package.json`**

```json
{
  "name": "dermatrichology-hub",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "server": "node server/index.js",
    "start": "node server/index.js",
    "create-admin": "node server/scripts/create-admin.js"
  },
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "lucide-react": "^0.563.0",
    "pg": "^8.12.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.13.0",
    "recharts": "^3.7.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}
```

Run: `npm install`
Expected: installs without errors, `@supabase/supabase-js` is gone from `node_modules` bin list once Task 13 removes it (still present here, that's fine — removed later).

- [ ] **Step 2: Write `server/db.js`**

```js
import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL env var is required');
}

export const pool = new Pool({ connectionString: DATABASE_URL });

export const query = (text, params) => pool.query(text, params);
```

- [ ] **Step 3: Write `server/index.js`**

```js
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

- [ ] **Step 4: Write `.env.example`**

```
DATABASE_URL=postgres://user:password@host:5432/dbname
JWT_SECRET=change-me-to-a-long-random-string
VITE_GEMINI_API_KEY=your-gemini-api-key
PORT=3001
```

- [ ] **Step 5: Add the dev proxy to `vite.config.ts`**

Modify `vite.config.ts:8-11` (the `server` block):

```ts
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
        },
      },
```

- [ ] **Step 6: Run it and verify the health check**

Create a local `.env` (not committed — already in `.gitignore`) with a real `DATABASE_URL` pointing at the Dokploy Postgres and any `JWT_SECRET` value, then:

```bash
npm run server
```

In another terminal:

```bash
curl -s http://localhost:3001/api/health
```

Expected: `{"ok":true}`

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json server/db.js server/index.js .env.example vite.config.ts
git commit -m "feat: scaffold Express backend with health check"
```

---

## Task 3: Auth core logic (`server/auth.js`) — TDD

**Files:**
- Create: `server/auth.test.js`
- Create: `server/auth.js`

**Interfaces:**
- Consumes: nothing (pure module, no DB).
- Produces: `hashPassword(plain)`, `verifyPassword(plain, hash)`, `signToken(payload)`, `verifyToken(token)`, `requireAuth(req, res, next)` — used by every route file from Task 4 onward.

- [ ] **Step 1: Write the failing test — `server/auth.test.js`**

```js
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'test-secret-for-auth-selfcheck';
const { hashPassword, verifyPassword, signToken, verifyToken } = await import('./auth.js');

const hash = await hashPassword('correct horse battery staple');
assert.equal(await verifyPassword('correct horse battery staple', hash), true, 'correct password should verify');
assert.equal(await verifyPassword('wrong password', hash), false, 'wrong password should not verify');

const token = signToken({ id: 'user-1', role: 'admin' });
const decoded = verifyToken(token);
assert.equal(decoded.id, 'user-1');
assert.equal(decoded.role, 'admin');

const tampered = token.slice(0, -1) + (token.at(-1) === 'a' ? 'b' : 'a');
assert.throws(() => verifyToken(tampered), 'tampered token must throw');

console.log('auth.js self-check passed');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node server/auth.test.js`
Expected: `Cannot find module '.../server/auth.js'` (file doesn't exist yet)

- [ ] **Step 3: Write `server/auth.js`**

```js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET env var is required');
}
const JWT_EXPIRES_IN = '7d';

export const hashPassword = (plain) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

export const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

export const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node server/auth.test.js`
Expected: `auth.js self-check passed` printed, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add server/auth.js server/auth.test.js
git commit -m "feat: add JWT + bcrypt auth core with self-check test"
```

---

## Task 4: Auth routes (`/api/auth/login`, `/api/auth/me`)

**Files:**
- Create: `server/routes/auth.js`
- Modify: `server/index.js`

**Interfaces:**
- Consumes: `query` from `server/db.js`, `verifyPassword`/`signToken`/`requireAuth` from `server/auth.js`.
- Produces: `POST /api/auth/login` → `{ token, profile }` or 401. `GET /api/auth/me` (Bearer token) → `{ profile }` or 401/404.

- [ ] **Step 1: Write `server/routes/auth.js`**

```js
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
```

- [ ] **Step 2: Mount it in `server/index.js`**

Modify `server/index.js` — add the import near the top and the mount before the static file serving:

```js
import authRoutes from './routes/auth.js';
```

```js
app.use('/api/auth', authRoutes);
```

Full file after this change:

```js
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

- [ ] **Step 3: Verify the failure path (no profile exists yet)**

```bash
npm run server
curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"nobody@test.local","password":"x"}'
```

Expected: `{"error":"Credenciales inválidas"}` with HTTP 401 (there's no `profiles` row yet — that's Task 5).

- [ ] **Step 4: Commit**

```bash
git add server/routes/auth.js server/index.js
git commit -m "feat: add login and me auth routes"
```

---

## Task 5: Create-admin script and end-to-end login verification

**Files:**
- Create: `server/scripts/create-admin.js`

**Interfaces:**
- Consumes: `query`, `pool` from `server/db.js`; `hashPassword` from `server/auth.js`.
- Produces: an `admin` row in `profiles`, usable by every later verification step and by Task 15's manual walkthrough.

- [ ] **Step 1: Write `server/scripts/create-admin.js`**

```js
import 'dotenv/config';
import crypto from 'node:crypto';
import { query, pool } from '../db.js';
import { hashPassword } from '../auth.js';

const [, , email, password, fullName] = process.argv;

if (!email || !password || !fullName) {
  console.error('Usage: node server/scripts/create-admin.js <email> <password> "<full name>"');
  process.exit(1);
}

const run = async () => {
  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO profiles (id, email, password_hash, role, full_name)
     VALUES ($1, $2, $3, 'admin', $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name`,
    [id, email, passwordHash, fullName]
  );
  console.log(`Admin profile ready for ${email}`);
  await pool.end();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Run it against the real Dokploy Postgres**

```bash
npm run create-admin -- admin@dermatrich.local "a-real-password-here" "Admin"
```

Expected: `Admin profile ready for admin@dermatrich.local`

- [ ] **Step 3: Verify login end-to-end**

With `npm run server` still running:

```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dermatrich.local","password":"a-real-password-here"}'
```

Expected: JSON with `token` and `profile` (profile has no `password_hash` field — confirms the destructure-strip in Task 4 works). Copy the `token` value, then:

```bash
curl -s http://localhost:3001/api/auth/me -H "Authorization: Bearer <paste-token>"
```

Expected: `{"profile":{"id":"...","email":"admin@dermatrich.local","role":"admin",...}}`

- [ ] **Step 4: Commit**

```bash
git add server/scripts/create-admin.js
git commit -m "feat: add create-admin script"
```

---

## Task 6: Patients routes

**Files:**
- Create: `server/routes/patients.js`
- Modify: `server/index.js`

**Interfaces:**
- Consumes: `query` from `server/db.js`.
- Produces: `GET /api/patients` (list), `GET /api/patients/:id`, `POST /api/patients` (upsert), `PATCH /api/patients/:id`, `DELETE /api/patients/:id`. Task 8's smoke test and Task 15's manual walkthrough both depend on this being correct — patients is the FK root for every clinical table.

- [ ] **Step 1: Write `server/routes/patients.js`**

```js
import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

const PATIENT_COLUMNS = [
  'id', 'nombre_completo', 'fecha_nacimiento', 'sexo', 'telefono', 'correo',
  'direccion', 'documento_identidad', 'contacto_emergencia', 'foto_perfil',
  'ocupacion', 'created_at'
];

router.get('/', async (req, res) => {
  const { rows } = await query('SELECT * FROM patients ORDER BY created_at DESC');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.post('/', async (req, res) => {
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
});

router.patch('/:id', async (req, res) => {
  const keys = PATIENT_COLUMNS.filter((c) => c !== 'id' && req.body[c] !== undefined);
  if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' });
  const sets = keys.map((k, i) => `${k} = $${i + 2}`);
  const values = keys.map((k) => req.body[k]);
  await query(`UPDATE patients SET ${sets.join(', ')} WHERE id = $1`, [req.params.id, ...values]);
  res.status(204).end();
});

router.delete('/:id', async (req, res) => {
  await query('DELETE FROM patients WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

export default router;
```

- [ ] **Step 2: Mount it behind auth in `server/index.js`**

Add the import:

```js
import { requireAuth } from './auth.js';
import patientsRoutes from './routes/patients.js';
```

Add the mount, after the auth routes mount:

```js
app.use('/api/patients', requireAuth, patientsRoutes);
```

- [ ] **Step 3: Verify with the admin token from Task 5**

```bash
TOKEN="<paste-token-from-task-5>"
curl -s -X POST http://localhost:3001/api/patients \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id":"11111111-1111-1111-1111-111111111111","nombre_completo":"Test Patient","sexo":"M","created_at":"2026-07-23T00:00:00Z"}'
curl -s http://localhost:3001/api/patients -H "Authorization: Bearer $TOKEN"
```

Expected: first call returns empty body (204), second call returns a JSON array containing the test patient.

- [ ] **Step 4: Commit**

```bash
git add server/routes/patients.js server/index.js
git commit -m "feat: add patients CRUD routes"
```

---

## Task 7: Appointments, settings, and profiles routes

**Files:**
- Create: `server/routes/appointments.js`
- Create: `server/routes/settings.js`
- Create: `server/routes/profiles.js`
- Modify: `server/index.js`

**Interfaces:**
- Consumes: `query` from `server/db.js`.
- Produces: `GET/POST /api/appointments`, `GET/PUT /api/settings`, `GET /api/profiles/:id`.

- [ ] **Step 1: Write `server/routes/appointments.js`**

```js
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
```

- [ ] **Step 2: Write `server/routes/settings.js`**

```js
import { Router } from 'express';
import { query } from '../db.js';

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

router.get('/', async (req, res) => {
  const { rows } = await query('SELECT * FROM settings LIMIT 1');
  res.json(rows[0] || DEFAULT_SETTINGS);
});

router.put('/', async (req, res) => {
  const { rows } = await query('SELECT id FROM settings LIMIT 1');
  const existing = rows[0];
  const keys = SETTINGS_COLUMNS.filter((c) => req.body[c] !== undefined);
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
});

export default router;
```

- [ ] **Step 3: Write `server/routes/profiles.js`**

```js
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
```

- [ ] **Step 4: Mount all three in `server/index.js`**

Add imports:

```js
import appointmentsRoutes from './routes/appointments.js';
import settingsRoutes from './routes/settings.js';
import profilesRoutes from './routes/profiles.js';
```

Add mounts, after the patients mount:

```js
app.use('/api/appointments', requireAuth, appointmentsRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/profiles', requireAuth, profilesRoutes);
```

- [ ] **Step 5: Verify**

```bash
TOKEN="<paste-token-from-task-5>"
curl -s http://localhost:3001/api/settings -H "Authorization: Bearer $TOKEN"
curl -s -X PUT http://localhost:3001/api/settings -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"app_name":"DermaTrich Test"}'
curl -s http://localhost:3001/api/settings -H "Authorization: Bearer $TOKEN"
```

Expected: first call returns `DEFAULT_SETTINGS`, second returns 204, third returns `{"app_name":"DermaTrich Test",...}` — confirms the singleton insert-then-update branch both work.

- [ ] **Step 6: Commit**

```bash
git add server/routes/appointments.js server/routes/settings.js server/routes/profiles.js server/index.js
git commit -m "feat: add appointments, settings, and profiles routes"
```

---

## Task 8: Generic clinical-history CRUD factory + 6 resource mounts

**Files:**
- Create: `server/lib/crudRouter.js`
- Create: `server/routes/clinical.js`
- Modify: `server/index.js`

**Interfaces:**
- Consumes: `query` from `server/db.js`.
- Produces: `createClinicalRouter({ path, table, columns, orderColumn?, allowUpdate?, allowDelete? })` factory. Mounted routes: `GET/POST /api/derm-histories` (+PATCH), `GET/POST /api/trich-histories` (+PATCH), `GET/POST /api/sessions`, `GET/POST /api/labs`, `GET/POST /api/treatments`, `GET/POST/DELETE /api/prescriptions`.

- [ ] **Step 1: Write `server/lib/crudRouter.js`**

`columns` must always be a fixed array of column names chosen by the caller (never derived from `req.body`) — this is what keeps table/column names out of injectable request data. Object/array values are `JSON.stringify`'d before being sent to `pg`, because several of these tables have `JSONB` columns (`habitos`, `examen_fisico`, `tricoscopia`, `escalas`, `diagnostico_estructurado`, `plan_tratamiento`, `fotos_comparativas`) and `pg` does not serialize JS objects automatically.

```js
import { Router } from 'express';
import { query } from '../db.js';

const toParam = (value) => (value !== null && typeof value === 'object') ? JSON.stringify(value) : value;

export const createClinicalRouter = ({ path, table, columns, orderColumn, allowUpdate = false, allowDelete = false }) => {
  const router = Router();

  router.get(`/${path}`, async (req, res) => {
    const { paciente_id } = req.query;
    if (!paciente_id) return res.status(400).json({ error: 'paciente_id query param is required' });
    const orderClause = orderColumn ? ` ORDER BY ${orderColumn} DESC` : '';
    const { rows } = await query(
      `SELECT * FROM ${table} WHERE paciente_id = $1${orderClause}`,
      [paciente_id]
    );
    res.json(rows);
  });

  router.post(`/${path}`, async (req, res) => {
    const keys = columns.filter((c) => req.body[c] !== undefined);
    const values = keys.map((k) => toParam(req.body[k]));
    const placeholders = keys.map((_, i) => `$${i + 1}`);
    await query(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')})`, values);
    res.status(204).end();
  });

  if (allowUpdate) {
    router.patch(`/${path}/:id`, async (req, res) => {
      const keys = columns.filter((c) => c !== 'id' && req.body[c] !== undefined);
      if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' });
      const sets = keys.map((k, i) => `${k} = $${i + 2}`);
      const values = keys.map((k) => toParam(req.body[k]));
      await query(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = $1`, [req.params.id, ...values]);
      res.status(204).end();
    });
  }

  if (allowDelete) {
    router.delete(`/${path}/:id`, async (req, res) => {
      await query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
      res.status(204).end();
    });
  }

  return router;
};
```

- [ ] **Step 2: Write `server/routes/clinical.js`**

```js
import { Router } from 'express';
import { createClinicalRouter } from '../lib/crudRouter.js';

const router = Router();

router.use(createClinicalRouter({
  path: 'derm-histories',
  table: 'derm_histories',
  columns: [
    'id', 'paciente_id', 'motivo_consulta', 'antecedentes_personales_patologicos',
    'antecedentes_familiares', 'alergias', 'medicamentos_actuales', 'habitos',
    'tipo_piel_fitzpatrick', 'historia_enfermedad', 'diagnosticos',
    'evolucion_clinica', 'observaciones', 'fecha'
  ],
  allowUpdate: true
}));

router.use(createClinicalRouter({
  path: 'trich-histories',
  table: 'trich_histories',
  columns: [
    'id', 'paciente_id', 'motivo_consulta', 'antecedentes_familiares',
    'enfermedades_hormonales', 'deficits_nutricionales', 'estres', 'cirugias',
    'infecciones', 'covid', 'medicamentos', 'inicio_caida', 'duracion',
    'patron_caida', 'cantidad_diaria', 'factores_desencadenantes',
    'estacionalidad', 'progresion', 'examen_fisico', 'tricoscopia', 'escalas',
    'diagnostico_estructurado', 'plan_tratamiento', 'fecha'
  ],
  allowUpdate: true
}));

router.use(createClinicalRouter({
  path: 'sessions',
  table: 'sessions',
  columns: [
    'id', 'paciente_id', 'fecha', 'evolucion_clinica', 'fotos_comparativas',
    'cambios_densidad', 'respuesta_tratamiento', 'ajustes_terapeuticos'
  ],
  orderColumn: 'fecha'
}));

router.use(createClinicalRouter({
  path: 'labs',
  table: 'labs',
  columns: ['id', 'paciente_id', 'fecha', 'analisis', 'resultados', 'interpretacion']
}));

router.use(createClinicalRouter({
  path: 'treatments',
  table: 'treatments',
  columns: [
    'id', 'paciente_id', 'fecha', 'tratamiento_topico', 'tratamiento_oral',
    'procedimientos', 'notas_adicionales'
  ]
}));

router.use(createClinicalRouter({
  path: 'prescriptions',
  table: 'prescriptions',
  columns: ['id', 'paciente_id', 'fecha', 'contenido', 'created_at'],
  orderColumn: 'fecha',
  allowDelete: true
}));

export default router;
```

- [ ] **Step 3: Mount it in `server/index.js`**

Add the import:

```js
import clinicalRoutes from './routes/clinical.js';
```

Add the mount, after the profiles mount:

```js
app.use('/api', requireAuth, clinicalRoutes);
```

- [ ] **Step 4: Verify the JSONB round-trip specifically (this is the part most likely to silently break)**

```bash
TOKEN="<paste-token-from-task-5>"
curl -s -X POST http://localhost:3001/api/trich-histories \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id":"22222222-2222-2222-2222-222222222222","paciente_id":"11111111-1111-1111-1111-111111111111","examen_fisico":{"cuero_cabelludo":["Eritema"],"fototipo":3},"fecha":"2026-07-23T00:00:00Z"}'
curl -s "http://localhost:3001/api/trich-histories?paciente_id=11111111-1111-1111-1111-111111111111" -H "Authorization: Bearer $TOKEN"
```

Expected: the GET response's `examen_fisico` field is a real JSON object `{"cuero_cabelludo":["Eritema"],"fototipo":3}`, not the string `"[object Object]"`.

- [ ] **Step 5: Commit**

```bash
git add server/lib/crudRouter.js server/routes/clinical.js server/index.js
git commit -m "feat: add generic clinical-history CRUD routes"
```

---

## Task 9: Frontend API client

**Files:**
- Create: `services/api.ts`

**Interfaces:**
- Produces: `api<T>(path, options)`, `getToken()`, `setToken(token)`, `clearToken()` — consumed by Task 10 (`services/db.ts`) and Task 11 (`context/AuthContext.tsx`).

- [ ] **Step 1: Write `services/api.ts`**

```ts
const API_BASE = '/api';
const TOKEN_KEY = 'dermatrich_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const api = async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {
      // response had no JSON body
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
};
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors introduced by this file (it isn't imported anywhere yet, so this mainly checks syntax).

- [ ] **Step 3: Commit**

```bash
git add services/api.ts
git commit -m "feat: add frontend API client"
```

---

## Task 10: Rewrite `services/db.ts`, delete `services/supabase.ts`

**Files:**
- Modify: `services/db.ts` (full rewrite)
- Delete: `services/supabase.ts`

**Interfaces:**
- Consumes: `api` from `services/api.ts` (Task 9).
- Produces: the exact same `DB.*` exported shape as before — every page (`pages/*.tsx`) that imports `DB` from `../services/db` keeps working with zero changes.

- [ ] **Step 1: Replace the full contents of `services/db.ts`**

```ts
import { api } from './api';
import { Patient, DermHistory, TrichHistory, Session, LabResult, Treatment, AppointmentRequest, AppSettings, UserProfile, Prescription } from '../types';

export const DB = {
  settings: {
    get: async (): Promise<AppSettings> => {
      try {
        return await api<AppSettings>('/settings');
      } catch (e) {
        console.error('DB: Error fetching settings:', e);
        return {
          app_name: 'DermaTrich',
          logo_url: '',
          logo_width: 220,
          logo_height: 100,
          doctor_name: 'Dr. Alejandro Pérez',
          doctor_profession: 'Dermatólogo-Tricólogo',
          doctor_photo_url: ''
        };
      }
    },
    save: async (settings: AppSettings) => {
      await api('/settings', { method: 'PUT', body: JSON.stringify(settings) });
      window.dispatchEvent(new Event('app-settings-changed'));
    }
  },

  profiles: {
    get: async (id: string): Promise<UserProfile | null> => {
      try {
        return await api<UserProfile>(`/profiles/${id}`);
      } catch (e) {
        console.error('DB: Error fetching profile:', e);
        throw e;
      }
    }
  },

  patients: {
    getAll: async (): Promise<Patient[]> => {
      try {
        const data = await api<Patient[]>('/patients');
        console.log('DB: Patients fetched:', data.length);
        return data;
      } catch (e) {
        console.error('DB: patient fetch failed', e);
        return [];
      }
    },
    getById: async (id: string): Promise<Patient | undefined> => {
      try {
        return await api<Patient>(`/patients/${id}`);
      } catch {
        return undefined;
      }
    },
    save: async (patient: Patient) => {
      await api('/patients', { method: 'POST', body: JSON.stringify(patient) });
    },
    delete: async (id: string) => {
      await api(`/patients/${id}`, { method: 'DELETE' });
    },
    update: async (id: string, patient: Partial<Patient>) => {
      await api(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(patient) });
    }
  },

  appointments: {
    getAll: async (): Promise<AppointmentRequest[]> => {
      return api<AppointmentRequest[]>('/appointments');
    },
    save: async (app: AppointmentRequest) => {
      await api('/appointments', { method: 'POST', body: JSON.stringify(app) });
    }
  },

  derm: {
    getByPatient: async (pId: string): Promise<DermHistory[]> => {
      return api<DermHistory[]>(`/derm-histories?paciente_id=${pId}`);
    },
    save: async (history: DermHistory) => {
      await api('/derm-histories', { method: 'POST', body: JSON.stringify(history) });
    },
    update: async (id: string, history: Partial<DermHistory>) => {
      await api(`/derm-histories/${id}`, { method: 'PATCH', body: JSON.stringify(history) });
    }
  },

  trich: {
    getByPatient: async (pId: string): Promise<TrichHistory[]> => {
      return api<TrichHistory[]>(`/trich-histories?paciente_id=${pId}`);
    },
    save: async (history: TrichHistory) => {
      await api('/trich-histories', { method: 'POST', body: JSON.stringify(history) });
    },
    update: async (id: string, history: Partial<TrichHistory>) => {
      await api(`/trich-histories/${id}`, { method: 'PATCH', body: JSON.stringify(history) });
    }
  },

  sessions: {
    getByPatient: async (pId: string): Promise<Session[]> => {
      return api<Session[]>(`/sessions?paciente_id=${pId}`);
    },
    save: async (session: Session) => {
      await api('/sessions', { method: 'POST', body: JSON.stringify(session) });
    }
  },

  labs: {
    getByPatient: async (pId: string): Promise<LabResult[]> => {
      return api<LabResult[]>(`/labs?paciente_id=${pId}`);
    },
    save: async (lab: LabResult) => {
      await api('/labs', { method: 'POST', body: JSON.stringify(lab) });
    }
  },

  treatments: {
    getByPatient: async (pId: string): Promise<Treatment[]> => {
      return api<Treatment[]>(`/treatments?paciente_id=${pId}`);
    },
    save: async (treatment: Treatment) => {
      await api('/treatments', { method: 'POST', body: JSON.stringify(treatment) });
    }
  },

  prescriptions: {
    getByPatient: async (pId: string): Promise<Prescription[]> => {
      return api<Prescription[]>(`/prescriptions?paciente_id=${pId}`);
    },
    save: async (prescription: Partial<Prescription>) => {
      await api('/prescriptions', { method: 'POST', body: JSON.stringify(prescription) });
    },
    delete: async (id: string) => {
      await api(`/prescriptions/${id}`, { method: 'DELETE' });
    }
  }
};
```

- [ ] **Step 2: Delete `services/supabase.ts`**

```bash
git rm services/supabase.ts
```

- [ ] **Step 3: Verify nothing else imports it**

```bash
grep -rn "services/supabase" --include="*.ts" --include="*.tsx" .
```

Expected: no output (Task 11 and Task 12 still reference it until they're done — if this is run before those tasks, `context/AuthContext.tsx` and `pages/Login.tsx` will show up; that's expected at this point in the plan and gets resolved by Task 11/12).

- [ ] **Step 4: Commit**

```bash
git add services/db.ts
git commit -m "feat: rewrite db service to call the new backend API"
```

---

## Task 11: Rewrite `context/AuthContext.tsx`

**Files:**
- Modify: `context/AuthContext.tsx` (full rewrite)

**Interfaces:**
- Consumes: `api`, `getToken`, `setToken`, `clearToken` from `services/api.ts` (Task 9).
- Produces: `useAuth()` returning `{ session, profile, loading, role, signOut, signIn }`. `session` is now `{ token: string } | null` (previously a Supabase `Session` object) — `AuthGuard.tsx` only checks truthiness of `session`, so this doesn't require any `AuthGuard.tsx` change. `signIn(email, password)` is new — consumed by Task 12.

- [ ] **Step 1: Replace the full contents of `context/AuthContext.tsx`**

Note: the previous version had a hardcoded fallback that force-granted `admin` role to `session.user.email === 'gucci7up@gmail.com'` if the profile fetch failed — a workaround for intermittent Supabase profile-fetch errors. That workaround is removed here: our own `/api/auth/login` returns the profile directly on success, so there's no separate fetch step that can fail independently of login.

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { api, getToken, setToken, clearToken } from '../services/api';

interface AuthContextType {
    session: { token: string } | null;
    profile: UserProfile | null;
    loading: boolean;
    role: 'admin' | 'doctor' | 'assistant' | null;
    signOut: () => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    profile: null,
    loading: true,
    role: null,
    signOut: async () => { },
    signIn: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<{ token: string } | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            const token = getToken();
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const { profile } = await api<{ profile: UserProfile }>('/auth/me');
                setSession({ token });
                setProfile(profile);
            } catch (e) {
                console.error('Auth: session restore failed', e);
                clearToken();
            } finally {
                setLoading(false);
            }
        };
        restoreSession();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { token, profile } = await api<{ token: string; profile: UserProfile }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        setToken(token);
        setSession({ token });
        setProfile(profile);
    };

    const signOut = async () => {
        clearToken();
        setSession(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{
            session,
            profile,
            loading,
            role: profile?.role || null,
            signOut,
            signIn,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 2: Commit**

```bash
git add context/AuthContext.tsx
git commit -m "feat: rewrite AuthContext to use JWT instead of Supabase auth"
```

---

## Task 12: Rewrite `pages/Login.tsx`

**Files:**
- Modify: `pages/Login.tsx:1-36`

**Interfaces:**
- Consumes: `signIn` from `useAuth()` (Task 11).

- [ ] **Step 1: Replace lines 1-36 of `pages/Login.tsx`** (imports + `handleLogin`; the JSX from line 37 onward is unchanged)

```tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await signIn(email, password);
            navigate('/');
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };
```

(The rest of the file — the JSX return block starting at the original line 38 — is untouched.)

- [ ] **Step 2: Verify the frontend compiles**

```bash
npx tsc --noEmit
```

Expected: no errors referencing `services/supabase` (Task 10 deleted it; Task 11/12 were its only other consumers besides `db.ts`, and both are now rewritten).

- [ ] **Step 3: Commit**

```bash
git add pages/Login.tsx
git commit -m "feat: use JWT auth in the login page"
```

---

## Task 13: Remove Supabase dependency and clean up env files

**Files:**
- Modify: `package.json` (remove `@supabase/supabase-js`)
- Modify: `.gitignore`
- Remove from git tracking: `.env.production`

**Interfaces:**
- None — this is a cleanup task with no code consumed/produced by later tasks.

- [ ] **Step 1: Remove the Supabase dependency**

Modify `package.json` — delete the `"@supabase/supabase-js": "^2.95.2",` line from `dependencies` (it should already be gone if Task 2's version of `package.json` was applied as the new source of truth; this step exists in case Task 2 was applied as a diff rather than a full replace).

Run: `npm install`
Expected: `package-lock.json` no longer lists any `@supabase/*` package.

- [ ] **Step 2: Stop tracking `.env.production` and tighten `.gitignore`**

`.env.production` is currently committed to git with a real `VITE_GEMINI_API_KEY` value in plain text (only bare `.env` is in `.gitignore` today, not `.env.production`). Fix the ignore rule and untrack the file (this keeps the key on disk locally, it just stops it from being committed going forward):

Modify `.gitignore` — change the line `.env` to:

```
.env*
!.env.example
```

```bash
git rm --cached .env.production
```

- [ ] **Step 3: Verify no Supabase references remain in source**

```bash
grep -rln "supabase" --include="*.ts" --include="*.tsx" --include="*.json" . | grep -v node_modules | grep -v package-lock.json
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git rm --cached .env.production 2>/dev/null || true
git commit -m "chore: remove Supabase dependency, stop tracking .env.production"
```

Tell the user separately (not part of this commit) to rotate the `VITE_GEMINI_API_KEY` value that was exposed in git history, since removing the file from tracking going forward does not erase it from past commits.

---

## Task 14: Verification pass 1 — automated smoke test

**Files:**
- Create: `server/smoke-test.js`

**Interfaces:**
- Consumes: the running server from Task 2 (`npm run server`) and the admin account from Task 5.

- [ ] **Step 1: Write `server/smoke-test.js`**

```js
import 'dotenv/config';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3001/api';
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD env vars (the account created by create-admin.js)');
  process.exit(1);
}

const call = async (path, options = {}, token) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const body = res.status === 204 ? null : await res.json();
  return { status: res.status, body };
};

const run = async () => {
  const health = await call('/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);
  console.log('health check passed');

  const badLogin = await call('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: 'definitely-wrong' }),
  });
  assert.equal(badLogin.status, 401);
  console.log('bad login rejected');

  const login = await call('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
  const token = login.body.token;
  console.log('login passed, token acquired');

  const me = await call('/auth/me', {}, token);
  assert.equal(me.status, 200);
  assert.equal(me.body.profile.email, ADMIN_EMAIL);
  console.log('me endpoint passed');

  const patientId = crypto.randomUUID();
  const createPatient = await call('/patients', {
    method: 'POST',
    body: JSON.stringify({
      id: patientId,
      nombre_completo: 'Smoke Test Patient',
      fecha_nacimiento: '1990-01-01',
      sexo: 'M',
      telefono: '0000',
      correo: 'smoke@test.local',
      direccion: 'N/A',
      documento_identidad: 'N/A',
      contacto_emergencia: 'N/A',
      foto_perfil: '',
      ocupacion: 'N/A',
      created_at: new Date().toISOString(),
    }),
  }, token);
  assert.equal(createPatient.status, 204);
  console.log('patient created');

  const list = await call('/patients', {}, token);
  assert.equal(list.status, 200);
  assert.ok(list.body.some((p) => p.id === patientId));
  console.log('patient list passed');

  const trichPayload = {
    id: crypto.randomUUID(),
    paciente_id: patientId,
    motivo_consulta: 'smoke test',
    antecedentes_familiares: '',
    enfermedades_hormonales: '',
    deficits_nutricionales: '',
    estres: '',
    cirugias: '',
    infecciones: '',
    covid: false,
    medicamentos: '',
    inicio_caida: '',
    duracion: '',
    patron_caida: '',
    cantidad_diaria: '',
    factores_desencadenantes: '',
    progresion: '',
    examen_fisico: { cuero_cabelludo: ['Eritema'], cabello: ['Frizz'], fototipo: 3, patron_alopecia: 'difuso' },
    tricoscopia: { zona_evaluada: 'vertex', miniaturizacion_pct: 20, vellosos: true, terminales: true, puntos_amarillos: false, puntos_negros: false, signos_inflamacion: false, notas: '' },
    escalas: { ludwig: 'I' },
    diagnostico_estructurado: { principal: 'Alopecia androgenética', secundarios: '', tipo_alopecia: 'AGA', fase: 'inicial', actividad_inflamatoria: false },
    plan_tratamiento: { topico: 'Minoxidil', oral: '', procedimientos: '' },
    fecha: new Date().toISOString(),
  };
  const createTrich = await call('/trich-histories', { method: 'POST', body: JSON.stringify(trichPayload) }, token);
  assert.equal(createTrich.status, 204);

  const trichList = await call(`/trich-histories?paciente_id=${patientId}`, {}, token);
  assert.equal(trichList.status, 200);
  assert.equal(trichList.body.length, 1);
  assert.deepEqual(trichList.body[0].examen_fisico, trichPayload.examen_fisico);
  console.log('JSONB round-trip passed (nested objects survived insert + read)');

  const del = await call(`/patients/${patientId}`, { method: 'DELETE' }, token);
  assert.equal(del.status, 204);
  console.log('cleanup passed');

  console.log('\nALL SMOKE TESTS PASSED');
};

run().catch((e) => {
  console.error('SMOKE TEST FAILED:', e);
  process.exit(1);
});
```

- [ ] **Step 2: Run it against the real backend + Dokploy Postgres**

```bash
npm run server &
SMOKE_ADMIN_EMAIL=admin@dermatrich.local SMOKE_ADMIN_PASSWORD="a-real-password-here" node server/smoke-test.js
```

Expected: `ALL SMOKE TESTS PASSED`, exit code 0. If anything fails, fix the root cause in the relevant Task's route file before moving on — this is verification pass 1 of the 2 the user asked for.

- [ ] **Step 3: Commit**

```bash
git add server/smoke-test.js
git commit -m "test: add end-to-end smoke test covering auth, patients, and JSONB round-trip"
```

---

## Task 15: Deploy to Dokploy + verification pass 2 (full manual walkthrough)

**Files:** none (deployment configuration + manual verification, not code)

- [ ] **Step 1: Confirm required env vars are set on the Dokploy service**

`DATABASE_URL`, `JWT_SECRET`, `VITE_GEMINI_API_KEY`. (No `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` needed anymore — remove them from the Dokploy app's env var list if present.)

- [ ] **Step 2: Redeploy and confirm the build now runs a Node server, not the static Caddy plan**

Trigger a redeploy on Dokploy. In the build log, confirm the run command is now `node server/index.js` (via `npm start`), not `caddy run`. Adding a real `start` script in Task 2 should make Nixpacks auto-detect a Node app instead of a static site; if the log still shows Caddy, check the Dokploy app's own "build type" setting in its dashboard and switch it from "static" to "Node/application" manually.

- [ ] **Step 3: Run `create-admin` against the production database** (if not already done against it in Task 5)

```bash
DATABASE_URL="<production-connection-string>" node server/scripts/create-admin.js admin@dermatrich.local "a-real-production-password" "Admin"
```

- [ ] **Step 4: Full manual walkthrough (verification pass 2)**

Open the deployed app in a browser and go through, in order, without skipping any step even if it looks like it was already covered by the smoke test:

1. `/login` — log in with the admin account created in Step 3. Expect redirect to `/`.
2. Dashboard loads without console errors.
3. `/patients` — list loads (empty is fine on a fresh DB).
4. `/patients/new` — create a patient, save, confirm it now appears in `/patients`.
5. Open the new patient's detail page — add a dermatological history entry and a trichological history entry (this exercises the `JSONB` fields through the real UI, not just curl).
6. `/consultations/new` — create a consultation for that patient.
7. Patient detail → prescription — write and save a prescription, confirm it appears in the patient's history.
8. `/patients/:id/print` — confirm the print report renders with the data just entered.
9. `/reports` and `/analytics` — confirm both load without errors (Analytics still calls Gemini directly, unrelated to this migration, but confirm it doesn't error due to a stale import).
10. `/settings` — change a setting (e.g. `app_name`), save, reload the page, confirm it persisted.
11. Log out, confirm redirect to `/login` and that `/patients` redirects back to `/login` when visited while logged out.
12. Log back in, confirm the session persists across a page refresh (tests the `/auth/me` restore path in `AuthContext`, not just fresh login).

- [ ] **Step 5: Final sweep for leftover Supabase references**

```bash
grep -rn "supabase" --include="*.ts" --include="*.tsx" . | grep -v node_modules
```

Expected: no output.

- [ ] **Step 6: Mark the migration done**

Once Steps 4 and 5 both pass with no issues, the migration is complete — Supabase can be decommissioned.
