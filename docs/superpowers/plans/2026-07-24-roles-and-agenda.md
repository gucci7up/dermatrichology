# Roles and Agenda Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the app into a secretary role restricted to a single appointment-scheduling screen, and a doctor/admin day-by-day appointment agenda showing patient name, cédula, and insurance status — reusing one shared booking-form and one shared appointment-row component across both screens.

**Architecture:** Frontend-only feature on top of the already-generic appointments backend (whitelist-based `POST`/`PATCH /api/appointments`). Two new pages (`Schedule.tsx` for the secretary, `Agenda.tsx` for the doctor) consume two new shared components (`AppointmentForm.tsx`, `AppointmentCard.tsx`) so the create/cancel/reschedule/confirm logic exists exactly once. `AuthGuard`/`Layout` route the `assistant` role to `/schedule` only; `admin`/`doctor` keep everything they have plus `/agenda`.

**Tech Stack:** React 19, TypeScript, existing Tailwind conventions, `useToast` from `context/ToastContext.tsx`, Express + `pg` backend (no ORM, whitelist-based columns, `asyncHandler`, `assertLengths`).

## Global Constraints

- No ORM — backend stays raw parameterized `pg`; new columns go through the existing `APPOINTMENT_COLUMNS` whitelist in `server/routes/appointments.js`, no new routes needed (`POST`/`PATCH` are already generic).
- Backend is plain JS ESM — no TypeScript in `server/`.
- Match existing Tailwind styling conventions from `pages/Consultations.tsx` (the file this plan extracts from) — same color/spacing/typography language, this is Phase 1 (functional), not the later visual redesign.
- `useToast()` must be called at the top of any component body that uses it (React hooks rule).
- A real `.env` exists at the repo root (`DATABASE_URL`, `JWT_SECRET`) — never modify or commit it. Admin credentials for verification: `gucci7up@gmail.com` — obtain the password out-of-band (do not commit it); never print it in a report or chat message.
- No new frontend test framework. Backend logic changes extend `server/smoke-test.js` with `node:assert/strict` (run via `SMOKE_ADMIN_EMAIL=gucci7up@gmail.com SMOKE_ADMIN_PASSWORD=<obtain out-of-band> node server/smoke-test.js` against the real Dokploy Postgres).
- `assistant` role must end up restricted to exactly `/schedule` — no other route reachable, including `/`.

---

### Task 1: Add `paciente_cedula` and `con_seguro` to appointments (schema + type + backend whitelist)

**Files:**
- Modify: `schema.sql`
- Modify: `types.ts`
- Modify: `server/routes/appointments.js`
- Modify: `server/smoke-test.js`

**Interfaces:**
- Produces: `appointments.paciente_cedula TEXT`, `appointments.con_seguro BOOLEAN DEFAULT false` columns, available to every later task via the existing generic `POST`/`PATCH /api/appointments` (already whitelist-driven — no route changes needed beyond the whitelist array).

- [ ] **Step 1: Add the columns to `schema.sql`** (for future fresh installs)

In `schema.sql`, find the `CREATE TABLE IF NOT EXISTS appointments (...)` block and add two columns before the closing `created_at TIMESTAMPTZ DEFAULT NOW()` line:
```sql
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_nombre TEXT NOT NULL,
    paciente_telefono TEXT,
    paciente_correo TEXT,
    paciente_cedula TEXT,
    especialidad TEXT CHECK (especialidad IN ('derm', 'trich')),
    fecha_preferida DATE,
    hora_preferida TEXT,
    fecha_nacimiento DATE,
    motivo TEXT,
    con_seguro BOOLEAN DEFAULT false,
    estado TEXT CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')) DEFAULT 'pendiente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Apply the same change to the REAL Dokploy Postgres (already-deployed DB)**

`schema.sql`'s `CREATE TABLE IF NOT EXISTS` won't touch a table that already exists. Run this against the live database using the `pg` package already in `node_modules` and the `DATABASE_URL` in the repo-root `.env`:
```bash
node -e "
const fs = require('fs');
const { Client } = require('pg');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();
const client = new Client({ connectionString: url });
client.connect()
  .then(() => client.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS paciente_cedula TEXT, ADD COLUMN IF NOT EXISTS con_seguro BOOLEAN DEFAULT false'))
  .then(() => client.query(\"SELECT column_name FROM information_schema.columns WHERE table_name = 'appointments' ORDER BY column_name\"))
  .then(res => { console.log(res.rows.map(r => r.column_name).join(', ')); return client.end(); })
  .catch(e => { console.error('FAIL:', e.message); process.exit(1); });
"
```
Expected output includes `con_seguro` and `paciente_cedula` in the column list.

- [ ] **Step 3: Add the two fields to `AppointmentRequest` in `types.ts`**

```ts
export interface AppointmentRequest {
  id: string;
  paciente_nombre: string;
  paciente_telefono: string;
  paciente_correo: string;
  paciente_cedula: string;
  especialidad: 'derm' | 'trich';
  fecha_preferida: string;
  hora_preferida: string; // Añadido para la agenda
  fecha_nacimiento?: string; // Added for prefilling patient data
  motivo: string;
  con_seguro: boolean;
  estado: 'pendiente' | 'confirmada' | 'cancelada';
  created_at: string;
}
```

- [ ] **Step 4: Add the two columns to the backend whitelist**

In `server/routes/appointments.js`, update `APPOINTMENT_COLUMNS`:
```js
const APPOINTMENT_COLUMNS = [
  'id', 'paciente_nombre', 'paciente_telefono', 'paciente_correo', 'paciente_cedula',
  'especialidad', 'fecha_preferida', 'hora_preferida', 'fecha_nacimiento',
  'motivo', 'con_seguro', 'estado', 'created_at'
];
```

- [ ] **Step 5: Add a smoke-test assertion**

In `server/smoke-test.js`, find the existing appointment-status-update block (the one that POSTs an appointment then PATCHes `estado`) and extend the POST body to include the two new fields, then assert they round-trip. Add this right after that existing block, using the admin `token` already in scope:
```js
  const cedulaApptId = crypto.randomUUID();
  await call('/appointments', { method: 'POST', body: JSON.stringify({ id: cedulaApptId, paciente_nombre: 'Smoke Cedula Test', paciente_cedula: 'V-12345678', con_seguro: true, especialidad: 'derm', fecha_preferida: '2026-08-02', hora_preferida: '11:00', motivo: 'test', estado: 'pendiente', created_at: new Date().toISOString() }) }, token);
  const cedulaAppts = await call('/appointments', {}, token);
  const savedAppt = cedulaAppts.body.find((a) => a.id === cedulaApptId);
  assert.equal(savedAppt.paciente_cedula, 'V-12345678', 'cedula should round-trip');
  assert.equal(savedAppt.con_seguro, true, 'con_seguro should round-trip');
  console.log('appointment cedula/seguro fields work');
```

- [ ] **Step 6: Verify**

```bash
npm run server   # background
SMOKE_ADMIN_EMAIL=gucci7up@gmail.com SMOKE_ADMIN_PASSWORD="<obtain out-of-band>" node server/smoke-test.js
```
Expected: `appointment cedula/seguro fields work` prints, plus all prior smoke lines, plus `ALL SMOKE TESTS PASSED`. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add schema.sql types.ts server/routes/appointments.js server/smoke-test.js
git commit -m "feat: add cedula and insurance fields to appointments"
```

---

### Task 2: Generic `DB.appointments.update` for rescheduling

**Files:**
- Modify: `services/db.ts`

**Interfaces:**
- Consumes: `api` from `services/api.ts` (unchanged).
- Produces: `DB.appointments.update(id: string, partial: Partial<AppointmentRequest>): Promise<void>` — a generic PATCH, used by Task 4's reschedule UI (distinct from the existing `updateStatus`, which only ever sends `estado`).

- [ ] **Step 1: Add the method**

In `services/db.ts`, inside the `appointments` block (next to the existing `getAll`/`save`/`updateStatus`), add:
```ts
    update: async (id: string, partial: Partial<AppointmentRequest>) => {
      await api(`/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(partial) });
    },
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
npm run build
```
Expected: no new errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add services/db.ts
git commit -m "feat: add generic appointment update method for rescheduling"
```

---

### Task 3: Shared appointment-creation form component

**Files:**
- Create: `components/AppointmentForm.tsx`

**Interfaces:**
- Consumes: `DB.appointments.save` from `services/db.ts`, `useToast` from `context/ToastContext.tsx`.
- Produces: `<AppointmentForm onSaved={() => void} />` — a self-contained controlled form. Used by Task 5 (`Schedule.tsx`) and Task 6 (`Agenda.tsx`).

Context: this is the "Nueva Cita" form currently embedded in `pages/Consultations.tsx` (lines ~244-312), extracted into its own component and extended with the two new fields (cédula, seguro). Styling matches the source exactly (dark `bg-slate-900` card).

- [ ] **Step 1: Write `components/AppointmentForm.tsx`**

```tsx
import React from 'react';
import { Calendar as CalendarIcon, Plus, ShieldCheck } from 'lucide-react';
import { DB } from '../services/db';
import { useToast } from '../context/ToastContext';

const emptyAppointmentForm = {
  paciente_nombre: '',
  paciente_telefono: '',
  paciente_cedula: '',
  especialidad: 'derm' as 'derm' | 'trich',
  fecha_preferida: '',
  hora_preferida: '',
  motivo: '',
  con_seguro: false,
};

export const AppointmentForm: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const { notify } = useToast();
  const [form, setForm] = React.useState(emptyAppointmentForm);
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await DB.appointments.save({
        id: crypto.randomUUID(),
        estado: 'pendiente',
        created_at: new Date().toISOString(),
        paciente_correo: '',
        ...form,
      });
      setForm(emptyAppointmentForm);
      notify('Cita creada correctamente', 'success');
      onSaved();
    } catch (error) {
      console.error('Error creating appointment:', error);
      notify('No se pudo crear la cita', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
      <div className="absolute -right-6 -top-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
        <CalendarIcon className="w-40 h-40" />
      </div>

      <div className="relative z-10 space-y-5">
        <div>
          <h3 className="text-xl font-black mb-2">Nueva Cita</h3>
          <p className="text-slate-400 text-xs font-bold leading-relaxed">Completa los datos para agendar una cita.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Nombre del paciente"
            value={form.paciente_nombre}
            onChange={(e) => setForm({ ...form, paciente_nombre: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-500 font-bold"
          />
          <input
            type="tel"
            required
            placeholder="Teléfono"
            value={form.paciente_telefono}
            onChange={(e) => setForm({ ...form, paciente_telefono: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-500 font-bold"
          />
          <input
            type="text"
            required
            placeholder="Cédula"
            value={form.paciente_cedula}
            onChange={(e) => setForm({ ...form, paciente_cedula: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-500 font-bold"
          />
          <select
            value={form.especialidad}
            onChange={(e) => setForm({ ...form, especialidad: e.target.value as 'derm' | 'trich' })}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
          >
            <option value="derm">Dermatología</option>
            <option value="trich">Tricología</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              required
              value={form.fecha_preferida}
              onChange={(e) => setForm({ ...form, fecha_preferida: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
            />
            <input
              type="time"
              required
              value={form.hora_preferida}
              onChange={(e) => setForm({ ...form, hora_preferida: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
            />
          </div>
          <textarea
            placeholder="Motivo de la consulta"
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-500 font-bold resize-none"
          />
          <label className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-2xl cursor-pointer">
            <input
              type="checkbox"
              checked={form.con_seguro}
              onChange={(e) => setForm({ ...form, con_seguro: e.target.checked })}
              className="w-5 h-5 rounded-md text-blue-500 focus:ring-blue-500"
            />
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold">Paciente con seguro médico</span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95"
          >
            <Plus className="w-4 h-4" /> {saving ? 'Guardando...' : 'Crear Cita'}
          </button>
        </form>
      </div>
    </section>
  );
};
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
npm run build
```
Expected: no new errors (this file isn't imported anywhere yet, so this mainly checks syntax/types), build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/AppointmentForm.tsx
git commit -m "feat: extract shared appointment-creation form component"
```

---

### Task 4: Shared appointment-row component (display + confirm/cancel/reschedule)

**Files:**
- Create: `components/AppointmentCard.tsx`

**Interfaces:**
- Consumes: `DB.appointments.updateStatus`/`DB.appointments.update` from `services/db.ts`, `useToast`, `AppointmentRequest` type.
- Produces: `<AppointmentCard appointment={AppointmentRequest} showConfirm={boolean} onChanged={() => void} />` — renders one appointment with hora/nombre/cédula/seguro badge/especialidad/estado, and Cancelar + Reprogramar buttons always, plus Confirmar when `showConfirm` is true. Used by Task 5 (`Schedule.tsx`, `showConfirm={false}`) and Task 6 (`Agenda.tsx`, `showConfirm={true}`).

- [ ] **Step 1: Write `components/AppointmentCard.tsx`**

```tsx
import React from 'react';
import { ShieldCheck, ShieldOff, Pencil } from 'lucide-react';
import { DB } from '../services/db';
import { AppointmentRequest } from '../types';
import { useToast } from '../context/ToastContext';

const estadoBadgeClasses: Record<AppointmentRequest['estado'], string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  confirmada: 'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-red-100 text-red-700',
};

export const AppointmentCard: React.FC<{
  appointment: AppointmentRequest;
  showConfirm: boolean;
  onChanged: () => void;
}> = ({ appointment, showConfirm, onChanged }) => {
  const { notify } = useToast();
  const [rescheduling, setRescheduling] = React.useState(false);
  const [fecha, setFecha] = React.useState(appointment.fecha_preferida);
  const [hora, setHora] = React.useState(appointment.hora_preferida);
  const [saving, setSaving] = React.useState(false);

  const handleUpdateStatus = async (estado: 'confirmada' | 'cancelada') => {
    try {
      await DB.appointments.updateStatus(appointment.id, estado);
      notify(estado === 'confirmada' ? 'Cita confirmada' : 'Cita cancelada', 'success');
      onChanged();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      notify('No se pudo actualizar la cita', 'error');
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await DB.appointments.update(appointment.id, { fecha_preferida: fecha, hora_preferida: hora });
      notify('Cita reprogramada', 'success');
      setRescheduling(false);
      onChanged();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      notify('No se pudo reprogramar la cita', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-white rounded-3xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all group">
      <div className="flex gap-4">
        <div className="font-black text-blue-600 text-sm py-1 border-r border-slate-200 pr-4 flex items-center justify-center min-w-[60px]">
          {appointment.hora_preferida}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition-colors">{appointment.paciente_nombre}</p>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${estadoBadgeClasses[appointment.estado]}`}>
              {appointment.estado}
            </span>
            {appointment.con_seguro ? (
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                <ShieldCheck className="w-3 h-3" /> Con Seguro
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                <ShieldOff className="w-3 h-3" /> Sin Seguro
              </span>
            )}
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
            CI: {appointment.paciente_cedula || 'N/A'} · {appointment.especialidad === 'derm' ? 'DERMATOLOGÍA' : 'TRICOLOGÍA'} · {new Date(appointment.fecha_preferida).toLocaleDateString()}
          </p>
        </div>
      </div>

      {rescheduling ? (
        <form onSubmit={handleReschedule} className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
          />
          <input
            type="time"
            required
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
          />
          <button type="submit" disabled={saving} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" onClick={() => setRescheduling(false)} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all">
            Cancelar
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          {showConfirm && (
            <button
              onClick={() => handleUpdateStatus('confirmada')}
              disabled={appointment.estado === 'confirmada'}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Confirmar
            </button>
          )}
          <button
            onClick={() => handleUpdateStatus('cancelada')}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => setRescheduling(true)}
            className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> Reprogramar
          </button>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
npm run build
```
Expected: no new errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/AppointmentCard.tsx
git commit -m "feat: extract shared appointment-row component with confirm/cancel/reschedule"
```

---

### Task 5: Secretary screen (`pages/Schedule.tsx`)

**Files:**
- Create: `pages/Schedule.tsx`

**Interfaces:**
- Consumes: `AppointmentForm` (Task 3), `AppointmentCard` (Task 4, `showConfirm={false}`), `DB.patients.getAll`, `DB.appointments.getAll`.
- Produces: default export `Schedule` page component. Consumed by Task 7's route wiring.

- [ ] **Step 1: Write `pages/Schedule.tsx`**

```tsx
import React from 'react';
import { CalendarClock, Users } from 'lucide-react';
import { DB } from '../services/db';
import { AppointmentForm } from '../components/AppointmentForm';
import { AppointmentCard } from '../components/AppointmentCard';
import { Patient, AppointmentRequest } from '../types';

const Schedule: React.FC = () => {
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [appointments, setAppointments] = React.useState<AppointmentRequest[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');

  const loadData = React.useCallback(async () => {
    try {
      const allPatients = await DB.patients.getAll();
      setPatients(allPatients);

      const allAppointments = await DB.appointments.getAll();
      const upcoming = allAppointments
        .filter((a) => a.estado !== 'cancelada')
        .sort((a, b) => {
          const dateCompare = a.fecha_preferida.localeCompare(b.fecha_preferida);
          if (dateCompare !== 0) return dateCompare;
          return a.hora_preferida.localeCompare(b.hora_preferida);
        });
      setAppointments(upcoming);
    } catch (error) {
      console.error('Error loading schedule data:', error);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPatients = patients.filter((p) =>
    p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cardClasses = 'bg-white rounded-[2rem] border border-slate-300 shadow-md overflow-hidden';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Agendar Citas</h1>
        <p className="text-slate-600 font-semibold">Registra, cancela o reprograma citas de pacientes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <AppointmentForm onSaved={loadData} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className={`${cardClasses} p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <CalendarClock className="w-6 h-6 text-blue-600" />
              <h3 className="font-black text-slate-900 text-base uppercase tracking-widest">Próximas Citas</h3>
            </div>
            <div className="space-y-4">
              {appointments.length > 0 ? (
                appointments.map((app) => (
                  <AppointmentCard key={app.id} appointment={app} showConfirm={false} onChanged={loadData} />
                ))
              ) : (
                <div className="py-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No hay citas agendadas</p>
                </div>
              )}
            </div>
          </section>

          <section className={`${cardClasses} p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-slate-500" />
              <h3 className="font-black text-slate-900 text-base uppercase tracking-widest">Pacientes Registrados</h3>
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full mb-4 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <span className="text-sm font-bold text-slate-800">{p.nombre_completo}</span>
                    <span className="text-xs font-bold text-slate-400">{p.telefono}</span>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-xs font-black text-slate-400 uppercase">Sin resultados</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
```

Note: this list intentionally renders only `nombre_completo` and `telefono` from each `Patient` — no other field (no `documento_identidad`, no photo, no link to `/patients/:id`) — matching the spec's requirement that the secretary sees patient existence for duplicate-checking only, not clinical data.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
npm run build
```
Expected: no new errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add pages/Schedule.tsx
git commit -m "feat: add secretary appointment-scheduling screen"
```

---

### Task 6: Doctor agenda screen (`pages/Agenda.tsx`)

**Files:**
- Create: `pages/Agenda.tsx`

**Interfaces:**
- Consumes: `AppointmentForm` (Task 3), `AppointmentCard` (Task 4, `showConfirm={true}`), `DB.appointments.getAll`.
- Produces: default export `Agenda` page component. Consumed by Task 7's route wiring.

- [ ] **Step 1: Write `pages/Agenda.tsx`**

```tsx
import React from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { DB } from '../services/db';
import { AppointmentForm } from '../components/AppointmentForm';
import { AppointmentCard } from '../components/AppointmentCard';
import { AppointmentRequest } from '../types';

const toDateInputValue = (d: Date) => d.toISOString().split('T')[0];

const Agenda: React.FC = () => {
  const [appointments, setAppointments] = React.useState<AppointmentRequest[]>([]);
  const [selectedDate, setSelectedDate] = React.useState(toDateInputValue(new Date()));
  const [showForm, setShowForm] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      const all = await DB.appointments.getAll();
      setAppointments(all);
    } catch (error) {
      console.error('Error loading agenda:', error);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const shiftDay = (delta: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(toDateInputValue(d));
  };

  const dayAppointments = appointments
    .filter((a) => a.fecha_preferida === selectedDate && a.estado !== 'cancelada')
    .sort((a, b) => a.hora_preferida.localeCompare(b.hora_preferida));

  const cardClasses = 'bg-white rounded-[2rem] border border-slate-300 shadow-md overflow-hidden';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Agenda</h1>
          <p className="text-slate-600 font-semibold">Citas del día, por especialidad y estado.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cerrar' : 'Nueva Cita'}
        </button>
      </div>

      {showForm && (
        <AppointmentForm onSaved={() => { loadData(); setShowForm(false); }} />
      )}

      <section className={`${cardClasses} p-6`}>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => shiftDay(-1)} aria-label="Día anterior" className="p-2 rounded-xl border border-slate-300 hover:bg-slate-50 transition-all">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-800"
          />
          <button onClick={() => shiftDay(1)} aria-label="Día siguiente" className="p-2 rounded-xl border border-slate-300 hover:bg-slate-50 transition-all">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="space-y-4">
          {dayAppointments.length > 0 ? (
            dayAppointments.map((app) => (
              <AppointmentCard key={app.id} appointment={app} showConfirm={true} onChanged={loadData} />
            ))
          ) : (
            <div className="py-16 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin citas para este día</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Agenda;
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
npm run build
```
Expected: no new errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add pages/Agenda.tsx
git commit -m "feat: add doctor day-by-day agenda screen"
```

---

### Task 7: Wire routes, roles, and menu

**Files:**
- Modify: `App.tsx`
- Modify: `components/AuthGuard.tsx`
- Modify: `components/Layout.tsx`

**Interfaces:**
- Consumes: `Schedule` (Task 5), `Agenda` (Task 6).
- Produces: `/schedule` and `/agenda` routes; `assistant` role restricted to `/schedule` only; `admin`/`doctor` gain an "Agenda" nav item.

- [ ] **Step 1: Add the two routes in `App.tsx`**

Add two lazy imports next to the existing ones:
```tsx
const Schedule = lazy(() => import('./pages/Schedule'));
const Agenda = lazy(() => import('./pages/Agenda'));
```
Add two routes inside the existing `<Routes>` block (alongside `/consultations`, etc.):
```tsx
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="/agenda" element={<Agenda />} />
```

- [ ] **Step 2: Update `components/AuthGuard.tsx`'s assistant restriction**

Replace the assistant-restriction block:
```tsx
    // Assistant restrictions
    // "Asistente - solo puede ver pacientes y consultas y el dashboard"
    if (role === 'assistant') {
        const allowedRoutes = ['/', '/patients', '/consultations'];
        const isAllowed = allowedRoutes.some(route =>
            location.pathname === route || location.pathname.startsWith(route + '/')
        );
        if (!isAllowed) {
            return <Navigate to="/" replace />;
        }
    }
```
with:
```tsx
    // Assistant (secretaria) restrictions: only the appointment-scheduling screen.
    if (role === 'assistant') {
        if (location.pathname !== '/schedule') {
            return <Navigate to="/schedule" replace />;
        }
    }
```

- [ ] **Step 3: Update `components/Layout.tsx`'s menu**

Replace the `allMenuItems` array:
```tsx
  const allMenuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', access: ['admin', 'doctor', 'assistant'] },
    { to: '/patients', icon: Users, label: 'Pacientes', access: ['admin', 'doctor', 'assistant'] },
    { to: '/consultations', icon: Stethoscope, label: 'Consultas', access: ['admin', 'doctor', 'assistant'] },
    { to: '/reports', icon: FileText, label: 'Reportes', access: ['admin', 'doctor'] },
    { to: '/settings', icon: Settings, label: 'Configuración', access: ['admin'] },
  ];
```
with:
```tsx
  const allMenuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', access: ['admin', 'doctor'] },
    { to: '/patients', icon: Users, label: 'Pacientes', access: ['admin', 'doctor'] },
    { to: '/consultations', icon: Stethoscope, label: 'Consultas', access: ['admin', 'doctor'] },
    { to: '/agenda', icon: CalendarClock, label: 'Agenda', access: ['admin', 'doctor'] },
    { to: '/reports', icon: FileText, label: 'Reportes', access: ['admin', 'doctor'] },
    { to: '/settings', icon: Settings, label: 'Configuración', access: ['admin'] },
    { to: '/schedule', icon: CalendarClock, label: 'Agendar Citas', access: ['assistant'] },
  ];
```
Add `CalendarClock` to the `lucide-react` import at the top of `components/Layout.tsx` (it currently imports `LayoutDashboard, Users, Stethoscope, FileText, Activity, Settings, Menu, ChevronRight, LogOut, Globe, Search as SearchIcon` — note `Activity` may already be unused from earlier work; only add `CalendarClock`, don't remove anything not verified unused).

Note: `menuItems = allMenuItems.filter(item => !role || item.access.includes(role))` (unchanged, further down in the file) already does the right thing with this new array — `assistant` will only match the last entry, `admin`/`doctor` will match everything except that one.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm run build
```
Expected: no new errors, build succeeds.

Manual verification checklist (do this against the real deployed app after Task 9's deploy, not now):
- Log in as `assistant` → lands on `/schedule`, sees only "Agendar Citas" in the menu, cannot navigate to `/`, `/patients`, `/consultations`, `/agenda`, `/reports`, `/settings` (each redirects back to `/schedule`).
- Log in as `admin`/`doctor` → sees "Agenda" in the menu alongside everything else, `/schedule` is reachable too (not menu-linked for them, but not blocked — `AuthGuard`'s assistant-only restriction doesn't apply to other roles).

- [ ] **Step 5: Commit**

```bash
git add App.tsx components/AuthGuard.tsx components/Layout.tsx
git commit -m "feat: route assistant role to schedule-only, add doctor agenda nav"
```

---

### Task 8: Remove the now-duplicated appointment UI from `pages/Consultations.tsx`

**Files:**
- Modify: `pages/Consultations.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed elsewhere — `Consultations.tsx` keeps its original purpose (starting a clinical consultation session for an existing patient: the activity timeline + "Iniciar Consulta" search panel), with the appointment-creation form and "Agenda Próxima" list removed now that `Schedule.tsx`/`Agenda.tsx` own that responsibility exclusively. Having three places that can create/cancel/reschedule appointments is a maintenance and consistency risk — this task removes the duplication this plan's earlier tasks created by extracting the logic elsewhere.

- [ ] **Step 1: Remove the appointment-related state, handlers, and imports**

In `pages/Consultations.tsx`, remove:
- The `emptyAppointmentForm` constant and `estadoBadgeClasses` constant (both now live in `AppointmentForm.tsx`/`AppointmentCard.tsx`).
- The `appointments`/`appointmentForm`/`savingAppointment` state (`useState` calls) and the `handleCreateAppointment`/`handleUpdateStatus` functions.
- The `DB.appointments.getAll()` call and its related filtering/sorting inside `loadData` (keep the `patients`/`recentSessions` loading logic — that part is unchanged and still needed by the "Iniciar Consulta" search panel and the activity timeline).
- The entire "NUEVA CITA" `<section>` (the dark card with the appointment form) and the entire "AGENDA PRÓXIMA DINÁMICA" `<section>` (the card listing appointments with Confirmar/Cancelar/Registrar y Atender buttons) from the JSX.
- Now-unused imports: `Plus`, `CalendarIcon` (Calendar as CalendarIcon), `AppointmentRequest` type import — verify each is genuinely unused elsewhere in the file before removing (grep the file after your edit: `grep -n "Plus\|CalendarIcon\|AppointmentRequest" pages/Consultations.tsx` should show nothing outside the import line for anything you remove).

The remaining page keeps: the header, the "Actividad Clínica Reciente" timeline section (`recentSessions`), and the "Iniciar Consulta" search-existing-patient card. The layout grid (`lg:grid-cols-3`) can collapse to whatever looks reasonable with only two sections left — use `lg:grid-cols-3` with the timeline still `lg:col-span-2` and the search card in the remaining column (i.e., just delete the two appointment sections, leave the grid structure and remaining sections as they are — no need to redesign the layout in this task).

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
npm run build
```
Expected: no new errors (specifically no "declared but never used" for anything left behind), build succeeds.

```bash
grep -n "DB.appointments\|handleCreateAppointment\|handleUpdateStatus\|estadoBadgeClasses\|emptyAppointmentForm" pages/Consultations.tsx
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add pages/Consultations.tsx
git commit -m "refactor: remove duplicated appointment UI from Consultations, now owned by Schedule/Agenda"
```

---

## Final verification

After all 8 tasks: redeploy this branch to Dokploy (point the app's Provider branch at it, same as prior work), run the full smoke test against the deployed backend, then do the manual walkthrough from Task 7 Step 4 — log in as the admin account and confirm the Agenda page, then (if a second test account with `role: 'assistant'` exists or can be created via `server/scripts/create-admin.js`-style insert) confirm the secretary's restricted view. Merge to `main` once verified.
