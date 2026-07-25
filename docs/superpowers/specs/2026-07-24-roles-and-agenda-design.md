# Roles y Agenda (Fase 1: funcional) — Design Spec

Fecha: 2026-07-24
Estado: aprobado, pendiente de plan de implementación

## Contexto

La doctora pidió reestructurar la app para separar el rol de secretaria (solo
agenda de citas) del rol del doctor, y darle al doctor un panel de citas por
día con nombre del paciente, cédula, y si tiene o no seguro. Este spec es la
Fase 1 (solo lógica/funcionalidad, con el estilo visual actual) de un pedido
más grande que también incluye un rediseño visual completo — el rediseño
visual queda como un spec separado, a hacer después de esta fase.

Estado actual relevante:
- El rol `assistant` ya existe (`context/AuthContext.tsx`, `components/AuthGuard.tsx`,
  `components/Layout.tsx`) con acceso a Dashboard, Pacientes y Consultas.
- `AppointmentRequest` (`types.ts`) no tiene cédula ni seguro — solo nombre,
  teléfono, correo, especialidad, fecha/hora preferida, motivo, estado.
- El backend ya tiene CRUD genérico para `appointments`
  (`server/routes/appointments.js`): `GET`, `POST`, y `PATCH /:id` (agregado
  en trabajo previo), todos parametrizados sobre una lista blanca de columnas
  (`APPOINTMENT_COLUMNS`) — agregar columnas nuevas no requiere rutas nuevas,
  solo extender esa lista blanca, el schema, y el tipo TS.
- `pages/Consultations.tsx` ya tiene un formulario de creación de cita y
  botones Confirmar/Cancelar (de trabajo previo) — este spec extrae esa
  lógica a un componente reutilizable en vez de duplicarla.

## Cambios de rol

`assistant` (secretaria) deja de tener acceso a Dashboard/Pacientes/Consultas.
Su única ruta permitida es `/schedule` (pantalla "Agendar Citas"). Al
loguearse, el destino por defecto para este rol es `/schedule`, no `/`.

`admin`/`doctor` mantienen todo lo que ya tienen, más una página nueva
`/agenda`.

`components/AuthGuard.tsx`: la restricción actual de `assistant`
(`allowedRoutes = ['/', '/patients', '/consultations']`) cambia a
`allowedRoutes = ['/schedule']`, y la redirección por defecto para este rol
(hoy `<Navigate to="/" />`) pasa a `<Navigate to="/schedule" />`.

`components/Layout.tsx`: el ítem de menú para `assistant` se reduce a un solo
ítem, "Agendar Citas" → `/schedule`. Se agrega un ítem nuevo "Agenda" →
`/agenda` con `access: ['admin', 'doctor']`.

## Componente compartido: formulario de cita

`components/AppointmentForm.tsx` (nuevo) — formulario controlado con los
campos: nombre, teléfono, cédula, especialidad (derm/trich), fecha
preferida, hora preferida, motivo, con/sin seguro (toggle). Al enviar, llama
`DB.appointments.save(...)` con un `id` nuevo, `estado: 'pendiente'` y
`created_at`. Recibe un callback `onSaved` para que la pantalla que lo use
recargue su lista y muestre un toast. Este componente es usado por AMBAS
pantallas (`/schedule` y `/agenda`) — una sola implementación, sin
duplicación.

## Pantalla "Agendar Citas" (`/schedule`, secretaria)

Página nueva `pages/Schedule.tsx`. Tres secciones:
1. `AppointmentForm` para crear una cita nueva.
2. Lista de referencia de pacientes existentes — **solo nombre y teléfono**
   (`DB.patients.getAll()` filtrado a esos dos campos en el render, sin
   enlace a la ficha clínica) — para que la secretaria pueda chequear si
   quien llama ya es paciente, sin acceso a historiales.
3. Lista de citas próximas (`estado !== 'cancelada'`) con dos acciones por
   fila: **Cancelar** (`DB.appointments.updateStatus(id, 'cancelada')`) y
   **Reprogramar** (edita `fecha_preferida`/`hora_preferida` vía
   `DB.appointments.update(id, {...})` — nuevo método genérico, ver abajo).
   Sin botón Confirmar — eso es exclusivo del doctor.

## Página "Agenda" (`/agenda`, doctor/admin)

Página nueva `pages/Agenda.tsx`. Vista por día:
- Selector de fecha con navegación día anterior/siguiente (default: hoy).
- Lista de citas de ese día (filtradas client-side sobre
  `DB.appointments.getAll()` comparando `fecha_preferida`), cada una
  mostrando: hora, nombre, **cédula**, badge **Con Seguro / Sin Seguro**,
  especialidad, estado.
- Acciones por cita: **Confirmar**, **Cancelar**, **Reprogramar** (mismas
  que la secretaria, más Confirmar).
- Botón "+ Nueva Cita" que abre `AppointmentForm` (mismo componente que usa
  `/schedule`) en un modal/sección expandible.

## Cambios de datos

`types.ts` — `AppointmentRequest` gana dos campos:
```ts
paciente_cedula: string;
con_seguro: boolean;
```

`schema.sql` (referencia) + migración real contra la DB de Dokploy ya
desplegada: `ALTER TABLE appointments ADD COLUMN paciente_cedula TEXT,
ADD COLUMN con_seguro BOOLEAN DEFAULT false;` — esto corre tanto en el
`schema.sql` del repo (para instalaciones nuevas) como directamente contra
la base ya viva (para no perder los datos existentes).

`server/routes/appointments.js` — `APPOINTMENT_COLUMNS` gana
`'paciente_cedula'` y `'con_seguro'`. Sin rutas nuevas — `POST`/`PATCH` ya
son genéricos sobre esa lista.

`services/db.ts` — `DB.appointments` gana un `update(id, partial)` genérico
(PATCH parcial, para reprogramar sin tener que pasar por
`updateStatus`), además del `updateStatus` que ya existe.

## Fuera de alcance (Fase 2, spec separado)

Rediseño visual completo (tipografía moderna, estilo visual nuevo) de toda
la app. Esta fase deja el look actual intacto — solo cambia estructura de
roles/páginas.
