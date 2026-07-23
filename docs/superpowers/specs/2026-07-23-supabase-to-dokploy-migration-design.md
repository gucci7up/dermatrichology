# Migración Supabase → Dokploy (Postgres + Express propio)

Fecha: 2026-07-23
Estado: aprobado, pendiente de plan de implementación

## Contexto

`dermatrichology-hub` (React 19 + Vite + TS) usa Supabase para DB (10 tablas vía
`supabase-js` `.from()`) y Auth (`signInWithPassword`, `onAuthStateChange`).
Objetivo: eliminar la dependencia de Supabase por completo y correr DB + Auth
propios en Dokploy. Fuera de alcance: cambios de features/UI — solo migración.

Infra existente: instancia Postgres ya corriendo en Dokploy (confirmado por el
usuario). Sin datos reales que preservar (entorno de prueba/vacío) — no hace
falta dump/restore, solo crear el esquema desde cero.

## Arquitectura

Hoy: Browser → Supabase (PostgREST + GoTrue) directo.
Nuevo: Browser → Express API (nuevo servicio en Dokploy) → Postgres (servicio
Dokploy existente). El browser deja de hablar con la DB directo — Postgres
plano no expone HTTP, hace falta un backend en el medio.

## Backend nuevo (`server/`)

- Node.js + Express + TypeScript (mismo lenguaje que el frontend).
- Driver `pg` crudo, sin ORM — 10 tablas, CRUD simple, ORM es sobre-ingeniería
  para este tamaño.
- Rutas espejan los métodos actuales de `services/db.ts`:
  `/api/patients`, `/api/appointments`, `/api/derm-histories`,
  `/api/trich-histories`, `/api/sessions`, `/api/labs`, `/api/treatments`,
  `/api/prescriptions`, `/api/settings`, `/api/profiles`.
- `/api/auth/login` — `bcrypt.compare` contra `profiles.password_hash`, firma
  JWT (rol + id + email en el payload).
- `/api/auth/me` — valida JWT del header `Authorization: Bearer`, devuelve el
  profile.
- Middleware JWT en todas las rutas protegidas, mismos roles que hoy usa
  `AuthGuard` (`admin` / `doctor` / `assistant`).

## Esquema DB

Base: `supabase_schema.sql` ya existe en el repo pero está incompleto frente a
`types.ts`. Se extiende a `schema.sql`:

- Tablas nuevas (usadas en `db.ts` pero ausentes del SQL actual):
  `profiles` (id UUID PK, email UNIQUE, password_hash, role CHECK IN
  admin/doctor/assistant, full_name, updated_at), `settings`, `prescriptions`.
- Columna faltante: `appointments.fecha_nacimiento`.
- Se elimina la referencia `patients.user_id → auth.users(id)` (ese schema no
  existe fuera de Supabase).
- Se eliminan las políticas RLS "Public Access" — la autorización pasa a
  vivir en el middleware Express, no en la DB.
- Sin Storage: `foto_perfil` hoy es un placeholder (`picsum.photos`), no hay
  upload real de archivos en ninguna page. No hay bucket que migrar.

## Frontend

Cambios de superficie mínima — mismos nombres de función, misma forma de uso
desde las pages:

- Borrar `services/supabase.ts` y la dependencia `@supabase/supabase-js`.
- Reescribir `services/db.ts`: mismos métodos (`DB.patients.list()`, etc.),
  por dentro hacen `fetch()` al backend en vez de `supabase.from()`.
- Reescribir `context/AuthContext.tsx`: JWT en `localStorage` en vez de
  `supabase.auth.onAuthStateChange`. Login llama `/api/auth/login`, guarda el
  token; al montar la app llama `/api/auth/me` para restaurar sesión; signOut
  limpia el token.
- `.env`: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` → `VITE_API_BASE_URL`.

## Deploy en Dokploy

- Un solo servicio Node sirve la API Express y el build estático de Vite
  juntos (un solo deploy, más simple que separar frontend/backend).
- Postgres: servicio ya existente, separado (dato persiste aparte del
  código).

## Verificación (doble pasada antes de cortar producción)

**Pasada 1 — por componente, durante el desarrollo:**
- Cada endpoint del backend probado contra la DB real (CRUD completo por
  tabla) antes de tocar el frontend.
- Login/JWT probado de punta a punta (registro de password hash, login,
  token válido, token expirado/inválido rechazado, rutas protegidas por rol).
- Cada page del frontend reconectada y probada manualmente contra el backend
  nuevo (login, listar pacientes, crear consulta, etc.) — recorrido
  equivalente al camino feliz de cada page tocada.

**Pasada 2 — checklist completo antes de considerar la migración terminada:**
- Repetir el recorrido completo de la app (login → dashboard → paciente →
  consulta → prescripción → reporte → analytics → logout) desde cero, sin
  dejar nada del checklist de la pasada 1 dado por sentado.
- Confirmar que no queda ninguna referencia a `supabase` en el código
  (`grep -r supabase` sobre `src`/`pages`/`services`/`context`) ni en
  `package.json`.
- Confirmar variables de entorno nuevas documentadas (`.env.example`
  actualizado) y que la app arranca en limpio solo con esas variables.

Check no-framework para lógica no trivial (hash/verify de password, firma/
verificación de JWT): `server/auth.test.ts` con `assert` nativo de Node — sin
librerías de testing, es la única lógica cuyo fallo rompería el login en
silencio.

## Fuera de alcance

Cambios de features/UI (pospuestos, el usuario pidió enfocar solo en la
migración).
