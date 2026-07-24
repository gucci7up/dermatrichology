# App Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the AI lab-interpretation feature and fix correctness bugs, UX/accessibility gaps, production-hardening issues, and add doctor-side appointment management + reliable per-patient PDF export to the dermatology/trichology clinic app.

**Architecture:** React 19 + Vite + TypeScript frontend (HashRouter, pages under `pages/`, shared `Layout`), Node + Express backend (`server/`, plain JS ESM, `pg` driver, no ORM, JWT+bcrypt auth) on Dokploy Postgres. Frontend talks to backend via `services/api.ts` → `services/db.ts` (`DB.*`). Settings are a Postgres singleton; the canonical field names are **snake_case** (`app_name`, `doctor_name`, `logo_url`, `logo_width`, `logo_height`, `doctor_profession`, `doctor_photo_url`) as defined in `types.ts` `AppSettings` and served by `server/routes/settings.js`.

**Tech Stack:** React 19, Vite 6, TypeScript, react-router-dom 7, lucide-react, recharts, Express 4, pg 8, bcryptjs, jsonwebtoken.

## Global Constraints

- No ORM — raw parameterized `pg` only; SQL identifiers only from hardcoded server-side whitelists, never request data.
- Backend is plain JS ESM (`"type": "module"`); no TypeScript in `server/`.
- All data routes stay behind `requireAuth`; `profiles.password_hash` never returned to the client.
- Settings field names are snake_case everywhere (`app_name`, `doctor_name`, `logo_url`, `logo_width`, `logo_height`, `doctor_profession`, `doctor_photo_url`). `Layout.tsx` is the correct reference usage.
- No new frontend test framework (the project has none). Frontend tasks verify via `npx tsc --noEmit` + browser/curl. Backend logic changes extend `server/smoke-test.js` with `node:assert/strict` assertions (run with `SMOKE_ADMIN_EMAIL=gucci7up@gmail.com SMOKE_ADMIN_PASSWORD=Gucci1826`).
- A real `.env` exists at repo root (`DATABASE_URL`, `JWT_SECRET`); never modify or commit it.
- Admin account for verification: `gucci7up@gmail.com` / `Gucci1826`. Do not print the password in chat reports.
- Scope is improvements to existing features only — do not redesign flows that already work (patient CRUD, clinical histories, photo upload, auth).

---

## Phase A — Remove AI lab-interpretation feature

### Task 1: Delete the Analytics/AI feature end to end

**Files:**
- Delete: `pages/Analytics.tsx`
- Delete: `services/gemini.ts`
- Modify: `App.tsx` (remove import + route)
- Modify: `components/Layout.tsx:83-90` (remove the `/analytics` menu item + now-unused `Activity` import)
- Modify: `package.json` (remove `@google/generative-ai` dependency)
- Modify: `index.html` (remove the pdf.js CDN `<script>` tags — only Analytics used PDF upload)

**Interfaces:**
- Produces: nothing consumed later. After this task there are zero references to `gemini`, `aiService`, `@google/generative-ai`, or `/analytics` in shipped code.

- [ ] **Step 1: Delete the two feature files**

```bash
git rm pages/Analytics.tsx services/gemini.ts
```

- [ ] **Step 2: Remove the route and import in `App.tsx`**

Remove the line `import Analytics from './pages/Analytics';` and remove the route line `<Route path="/analytics" element={<Analytics />} />`. Leave every other route unchanged.

- [ ] **Step 3: Remove the nav item in `components/Layout.tsx`**

In `allMenuItems` (around `Layout.tsx:83-90`), delete this entry:
```js
    { to: '/analytics', icon: Activity, label: 'Análisis', access: ['admin', 'doctor'] },
```
Then remove `Activity` from the `lucide-react` import at the top of the file (it is no longer used after this deletion — verify with a grep that `Activity` appears nowhere else in `Layout.tsx`).

- [ ] **Step 4: Remove `@google/generative-ai` from `package.json`**

Delete the `"@google/generative-ai": "^0.24.1",` line from `dependencies`, then run:
```bash
npm install
```
Expected: installs cleanly; `@google/generative-ai` no longer in `package-lock.json`.

- [ ] **Step 5: Remove the pdf.js CDN from `index.html`**

Delete these two blocks from `<head>`:
```html
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <script>
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    </script>
```

- [ ] **Step 6: Verify no dangling references and it compiles**

```bash
grep -rn "gemini\|aiService\|generative-ai\|analytics\|Analytics" pages/ components/ services/ App.tsx index.html
npx tsc --noEmit
npm run build
```
Expected: grep returns nothing (case-insensitive check too: `grep -rin "analytics"` — none). `tsc` shows no NEW errors referencing the deleted files. `npm run build` succeeds. Bundle should shrink (recharts + generative-ai dropped from that page's graph — recharts may remain if used elsewhere; confirm with `grep -rn recharts pages/`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: remove AI lab-interpretation analytics feature"
```

---

## Phase B — Correctness bugs

### Task 2: Fix Dashboard settings field names and remove fake stats

**Files:**
- Modify: `pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `DB.settings.get()` returning `AppSettings` (snake_case per `types.ts`), `DB.patients.getAll()`, `DB.appointments.getAll()`.
- Produces: nothing consumed later.

Context: `Dashboard.tsx:28-36` initializes settings state with camelCase keys (`appName`, `doctorName`, …) and reads `settings.doctorName` at line 70 — these are always `undefined` because the API returns snake_case, so the welcome shows no name. Lines 86-89 show hardcoded fake figures ("42" active treatments, "3" pending labs, `trend={12}`, `trend={8}`) to a real doctor.

- [ ] **Step 1: Fix the settings state shape and welcome read**

Replace the `useState` initializer (`Dashboard.tsx:28-36`) with snake_case matching `AppSettings`:
```tsx
  const [settings, setSettings] = React.useState<AppSettings>({
    app_name: 'DermaTrich',
    logo_url: '',
    logo_width: 220,
    logo_height: 100,
    doctor_name: 'Cargando...',
    doctor_profession: '...',
    doctor_photo_url: ''
  });
```
Change the import on line 4 from `import { DB, AppSettings } from '../services/db';` to `import { DB } from '../services/db';` and add `AppSettings` to the type import from `../types` (line 5): `import { Patient, AppointmentRequest, AppSettings } from '../types';` (`AppSettings` is exported by `types.ts`, not by `services/db.ts` — the old import was a tsc error).
Change line 70 `{settings.doctorName}` to `{settings.doctor_name}`.

- [ ] **Step 2: Replace the two fake stat cards with real data (and honest trends)**

The app has no historical month-over-month data, so the `trend` figures are fabricated. Compute the two fake cards from real data and drop the invented trend deltas. Replace the four `<StatCard>` lines (`Dashboard.tsx:86-89`) with:
```tsx
        <StatCard label="Pacientes Totales" value={totalPatients} icon={Users} trend={0} color="bg-[#d3b3a8]" />
        <StatCard label="Citas Pendientes" value={appointments.length} icon={Clock} trend={0} color="bg-indigo-600" />
        <StatCard label="Consultas Registradas" value={sessionCount} icon={TrendingUp} trend={0} color="bg-emerald-500" />
        <StatCard label="Pacientes con Labs" value={labPatientCount} icon={FlaskConical} trend={0} color="bg-orange-500" />
```
Add the two new counts. In the component body add state:
```tsx
  const [sessionCount, setSessionCount] = React.useState(0);
  const [labPatientCount, setLabPatientCount] = React.useState(0);
```
Inside the existing `loadData` in the `useEffect` (after `allPatients` is fetched), compute them from real data:
```tsx
        let sessions = 0;
        let withLabs = 0;
        await Promise.all(allPatients.map(async (p) => {
          const [s, l] = await Promise.all([
            DB.sessions.getByPatient(p.id),
            DB.labs.getByPatient(p.id),
          ]);
          sessions += s.length;
          if (l.length > 0) withLabs += 1;
        }));
        setSessionCount(sessions);
        setLabPatientCount(withLabs);
```

- [ ] **Step 3: Fix the fake "Última Visita" cell**

`Dashboard.tsx:124` renders the literal string `Reciente` for every patient's last visit. Replace that `<td>`'s content with the patient's `created_at` date (the only date available on the patient record), formatted:
```tsx
                      <td className="px-6 py-4 text-sm text-slate-500">{patient.created_at ? new Date(patient.created_at).toLocaleDateString() : 'N/A'}</td>
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm run build
```
Expected: no new tsc errors in `Dashboard.tsx`; build succeeds. Manual: after deploy/preview, the dashboard greeting shows the doctor's real name and the four stat cards show real counts (no "42"/"3"), no "+12%/+8%" deltas.

- [ ] **Step 5: Commit**

```bash
git add pages/Dashboard.tsx
git commit -m "fix: dashboard reads snake_case settings and shows real stats"
```

### Task 3: Fix PrintReport settings field names (logo + signature on printed report)

**Files:**
- Modify: `pages/PrintReport.tsx`

**Interfaces:**
- Consumes: `DB.settings.get()` → `AppSettings` (snake_case).

Context: `PrintReport.tsx` uses camelCase settings throughout the header and signature (`settings.logoWidth`, `settings.logoUrl`, `settings.logoHeight`, `settings.appName`, `settings.doctorName`, `settings.doctorProfession`) — all `undefined` at runtime, so printed reports (a document handed to patients) show no logo, a blank clinic name, and a blank signature. `Layout.tsx` uses the correct snake_case names.

- [ ] **Step 1: Replace every camelCase settings reference with snake_case**

In `pages/PrintReport.tsx` make exactly these replacements:
- Line 4: `import { DB, AppSettings } from '../services/db';` → `import { DB } from '../services/db';` and add `AppSettings` to the `../types` import on line 5.
- Line 90: `settings.logoWidth + 10` → `settings.logo_width + 10`; `settings.logoHeight + 10` → `settings.logo_height + 10`.
- Line 91: `settings.logoUrl` → `settings.logo_url`.
- Line 92: `src={settings.logoUrl}` → `src={settings.logo_url}`; `width: settings.logoWidth` → `width: settings.logo_width`; `height: settings.logoHeight` → `height: settings.logo_height`.
- Line 95: `settings.appName.charAt(0)` → `settings.app_name.charAt(0)`.
- Line 100: `{settings.appName}` → `{settings.app_name}`.
- Line 219: `{settings.doctorName}` → `{settings.doctor_name}`.
- Line 220: `{settings.doctorProfession}` → `{settings.doctor_profession}`.

- [ ] **Step 2: Verify**

```bash
grep -n "logoWidth\|logoUrl\|logoHeight\|appName\|doctorName\|doctorProfession" pages/PrintReport.tsx
npx tsc --noEmit
```
Expected: grep returns nothing; no new tsc errors. Manual after deploy: open a patient → `/patients/:id/print`; the header shows the clinic logo (if set) or clinic name, and the signature block shows the doctor's name + profession.

- [ ] **Step 3: Commit**

```bash
git add pages/PrintReport.tsx
git commit -m "fix: printed report reads snake_case settings (logo + signature)"
```

---

## Phase C — Production hardening (backend)

### Task 4: Rate-limit the login endpoint

**Files:**
- Create: `server/lib/rateLimit.js`
- Modify: `server/routes/auth.js` (apply limiter to `POST /login`)
- Modify: `server/smoke-test.js` (add assertion)

**Interfaces:**
- Consumes: nothing.
- Produces: `rateLimit({ windowMs, max })` returning Express middleware — a fixed-window in-memory limiter keyed by client IP.

Rationale: `/api/auth/login` has no throttling — a healthcare login is a brute-force target. In-memory fixed-window is sufficient for a single-process deployment (no new dependency). `ponytail:` in-memory only — if the app ever runs multiple replicas, swap for a shared store.

- [ ] **Step 1: Write `server/lib/rateLimit.js`**

```js
// ponytail: in-memory fixed-window limiter; single-process only. Swap for a
// shared store (Redis) if this ever runs multiple replicas.
export const rateLimit = ({ windowMs, max }) => {
  const hits = new Map(); // ip -> { count, resetAt }
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now > entry.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ error: 'Demasiados intentos. Intente más tarde.' });
    }
    next();
  };
};
```

- [ ] **Step 2: Apply it to login in `server/routes/auth.js`**

Add the import at the top: `import { rateLimit } from '../lib/rateLimit.js';`
Define a limiter above the routes: `const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });`
Change the login route registration to insert the limiter before the handler: `router.post('/login', loginLimiter, asyncHandler(async (req, res) => { ... }))` (the handler is already wrapped in `asyncHandler` from the earlier error-handling fix — keep that wrapper, just add `loginLimiter` as the middleware before it).

- [ ] **Step 3: Add a smoke-test assertion**

In `server/smoke-test.js`, after the existing bad-login check, add a loop that hits `/auth/login` 11 times with wrong credentials and asserts the last response is `429`:
```js
  let got429 = false;
  for (let i = 0; i < 12; i++) {
    const r = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'ratelimit@test.local', password: 'x' }) });
    if (r.status === 429) { got429 = true; break; }
  }
  assert.equal(got429, true, 'login should rate-limit after repeated attempts');
  console.log('login rate-limit works');
```
Note: this consumes the limiter budget for the test IP. Place this AFTER the successful admin login/token acquisition so it does not block the real login used by the rest of the smoke test (the admin login uses the same IP — so instead, acquire the admin token BEFORE this block, which the current smoke-test order already does; the rate-limit uses a different email but the same IP, so to avoid locking out subsequent legitimate calls, use `max: 10` and run this block LAST, right before the final cleanup, OR key acceptable: since all smoke calls share one IP, move this block to the very end after all other assertions and the patient cleanup delete has run). Implement it as the final assertion block before the `ALL SMOKE TESTS PASSED` log.

- [ ] **Step 4: Verify**

```bash
npm run server   # background
SMOKE_ADMIN_EMAIL=gucci7up@gmail.com SMOKE_ADMIN_PASSWORD="Gucci1826" node server/smoke-test.js
```
Expected: `login rate-limit works` prints and `ALL SMOKE TESTS PASSED`. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add server/lib/rateLimit.js server/routes/auth.js server/smoke-test.js
git commit -m "feat: rate-limit login endpoint against brute force"
```

### Task 5: Backend input length validation

**Files:**
- Create: `server/lib/validate.js`
- Modify: `server/lib/crudRouter.js`, `server/routes/patients.js`, `server/routes/appointments.js`, `server/routes/settings.js` (apply the guard on write handlers)
- Modify: `server/smoke-test.js` (add assertion)

**Interfaces:**
- Consumes: nothing.
- Produces: `assertLengths(body, max = 20000)` — throws a `{ status: 400 }`-tagged error if any string field in `body` exceeds `max` chars. Used at the top of every POST/PATCH/PUT handler that writes request data.

Rationale: no length bounds today; a client can push arbitrarily large strings into TEXT/JSONB columns. A single shared guard is the lazy correct fix.

- [ ] **Step 1: Write `server/lib/validate.js`**

```js
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Rejects any top-level string field longer than `max` chars. JSONB objects
// are stringified for the length check so a giant nested blob is also caught.
export const assertLengths = (body, max = 20000) => {
  for (const [key, value] of Object.entries(body || {})) {
    const asString = typeof value === 'string' ? value : (value && typeof value === 'object' ? JSON.stringify(value) : '');
    if (asString.length > max) {
      throw new HttpError(400, `Field '${key}' exceeds maximum length of ${max} characters`);
    }
  }
};
```

- [ ] **Step 2: Make the global error middleware honor `HttpError.status`**

In `server/index.js`, update the global error handler added previously so it uses `err.status` when present:
```js
app.use((err, req, res, next) => {
  console.error('Unhandled route error:', err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});
```

- [ ] **Step 3: Call `assertLengths` in every write handler**

Import `assertLengths` in each of `crudRouter.js`, `patients.js`, `appointments.js`, `settings.js`. At the first line inside each POST/PATCH/PUT handler body, call `assertLengths(req.body);` (the async wrapper + global handler will convert the thrown `HttpError` into a 400). Example for `patients.js` POST: the handler becomes
```js
router.post('/', asyncHandler(async (req, res) => {
  assertLengths(req.body);
  const keys = PATIENT_COLUMNS.filter((c) => req.body[c] !== undefined);
  // ...unchanged...
}));
```
Apply the same single added line to: `patients.js` POST + PATCH; `appointments.js` POST; `settings.js` PUT; and both POST and PATCH inside `crudRouter.js`'s `createClinicalRouter`.

- [ ] **Step 4: Add a smoke-test assertion**

In `server/smoke-test.js`, add (using the admin token): POST a patient with a `nombre_completo` of 20001 `'a'` chars and assert `400`:
```js
  const tooLong = await call('/patients', { method: 'POST', body: JSON.stringify({ id: crypto.randomUUID(), nombre_completo: 'a'.repeat(20001) }) }, token);
  assert.equal(tooLong.status, 400, 'oversized field should be rejected');
  console.log('input length validation works');
```

- [ ] **Step 5: Verify**

```bash
npm run server   # background
SMOKE_ADMIN_EMAIL=gucci7up@gmail.com SMOKE_ADMIN_PASSWORD="Gucci1826" node server/smoke-test.js
```
Expected: `input length validation works` + `ALL SMOKE TESTS PASSED`. Stop server.

- [ ] **Step 6: Commit**

```bash
git add server/lib/validate.js server/index.js server/lib/crudRouter.js server/routes/patients.js server/routes/appointments.js server/routes/settings.js server/smoke-test.js
git commit -m "feat: reject oversized request fields with 400"
```

### Task 6: Code-split the frontend bundle with lazy routes

**Files:**
- Modify: `App.tsx`

**Interfaces:**
- Consumes: existing page components.
- Produces: nothing consumed later.

Rationale: the production bundle is a single ~832 KB chunk (Vite warns). Route-level `React.lazy` + `Suspense` splits each page into its own chunk so the login/dashboard load fast; heavy pages (PatientDetail, recharts consumers) load on demand.

- [ ] **Step 1: Convert page imports to lazy in `App.tsx`**

Replace the static page imports with `React.lazy`, e.g.:
```tsx
import React, { lazy, Suspense } from 'react';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PatientList = lazy(() => import('./pages/PatientList'));
const PatientDetail = lazy(() => import('./pages/PatientDetail'));
const NewPatient = lazy(() => import('./pages/NewPatient'));
const Settings = lazy(() => import('./pages/Settings'));
const PrintReport = lazy(() => import('./pages/PrintReport'));
const Reports = lazy(() => import('./pages/Reports'));
const Consultations = lazy(() => import('./pages/Consultations'));
const NewConsultation = lazy(() => import('./pages/NewConsultation'));
const Prescription = lazy(() => import('./pages/Prescription'));
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
```
Keep `Layout` and `AuthGuard` as normal (non-lazy) imports — they wrap everything.

- [ ] **Step 2: Wrap the route trees in `Suspense`**

Wrap the `<Routes>` blocks with a `Suspense` fallback (reuse the existing spinner style from `AuthGuard`):
```tsx
<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-2 border-[#d3b3a8]/30 border-t-[#d3b3a8] rounded-full animate-spin" /></div>}>
  {/* existing <Routes>…</Routes> */}
</Suspense>
```
Both the top-level routes and the nested routes inside `Layout` should be under a `Suspense` (one wrapping the outer `<Routes>` is sufficient since it covers nested lazy children).

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npm run build
```
Expected: build succeeds and emits multiple JS chunks under `dist/assets/` (not one monolith); the main entry chunk is materially smaller than 832 KB. Manual: preview, confirm login → dashboard → patient detail all still load (with a brief spinner on first visit to each).

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "perf: code-split pages with lazy routes"
```

### Task 7: Build Tailwind at compile time instead of the CDN

**Files:**
- Create: `tailwind.config.js`, `postcss.config.js`, `src/index.css` (Tailwind entry)
- Modify: `index.html` (remove Tailwind CDN script; keep fonts), `index.tsx` (import the CSS), `package.json` (add devDeps)

**Interfaces:**
- Consumes: existing Tailwind utility classes throughout `pages/` and `components/`.
- Produces: a built CSS file replacing the runtime CDN.

Rationale: `index.html` loads `https://cdn.tailwindcss.com`, which prints a "should not be used in production" warning and pulls a large runtime + external dependency (also a CSP liability). Compiling Tailwind is the supported production path.

- [ ] **Step 1: Add Tailwind toolchain**

```bash
npm install -D tailwindcss@^3 postcss autoprefixer
```

- [ ] **Step 2: Create `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './**/*.{ts,tsx}', '!./node_modules/**'],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 3: Create `postcss.config.js`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 4: Create `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { font-family: 'Inter', sans-serif; }
```

- [ ] **Step 5: Wire it up and drop the CDN**

In `index.tsx` add at the top: `import './src/index.css';`
In `index.html`: delete `<script src="https://cdn.tailwindcss.com"></script>`, delete the inline `<style>body{...}</style>` block (moved into `src/index.css`), and delete the `<link rel="stylesheet" href="/index.css">` line (that file "doesn't exist at build time" per the Vite warning). Keep the Google Fonts `<link>`.

- [ ] **Step 6: Verify the built CSS contains the app's utilities**

```bash
npm run build
```
Expected: build succeeds; `dist/assets/` now contains a CSS file of non-trivial size (the compiled Tailwind). Manual: preview the app and confirm styling is intact (colors like `#d3b3a8`, rounded cards, spacing) and the browser console no longer prints the `cdn.tailwindcss.com should not be used in production` warning.

- [ ] **Step 7: Commit**

```bash
git add tailwind.config.js postcss.config.js src/index.css index.html index.tsx package.json package-lock.json
git commit -m "build: compile Tailwind instead of loading the CDN in production"
```

---

## Phase D — UX and accessibility

### Task 8: Toast notifications to replace `alert()`

**Files:**
- Create: `context/ToastContext.tsx`
- Modify: `index.tsx` (wrap app in `ToastProvider`)
- Modify: every page currently calling `alert(...)`: `pages/PatientDetail.tsx` (7), `pages/Prescription.tsx` (2), `pages/NewPatient.tsx` (1), `pages/NewConsultation.tsx` (1), `pages/PatientList.tsx` (1), `pages/Landing.tsx` (1), `pages/Settings.tsx` (1)

**Interfaces:**
- Consumes: nothing.
- Produces: `useToast()` → `{ notify(message, type?) }` where `type` is `'success' | 'error' | 'info'` (default `'info'`). Renders a top-right stack; each toast auto-dismisses after 4s.

- [ ] **Step 1: Write `context/ToastContext.tsx`**

```tsx
import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }
interface ToastCtx { notify: (message: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastCtx>({ notify: () => {} });

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  const color = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-slate-900' };
  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div key={t.id} className={`${color[t.type]} text-white px-5 py-3 rounded-xl shadow-2xl font-bold text-sm max-w-sm motion-safe:animate-in motion-safe:slide-in-from-right-4`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
```

- [ ] **Step 2: Wrap the app in `index.tsx`**

Inside the existing `<ErrorBoundary>`, wrap `<App />` with `<ToastProvider>` (import it). `AuthProvider` is inside `App`; `ToastProvider` should sit above `App` so every page can call `useToast`.

- [ ] **Step 3: Replace each `alert(...)` call**

In each listed page: import `useToast`, call `const { notify } = useToast();` in the component body, and replace `alert('message')` with `notify('message', 'error')` for failures (the ones inside `catch`) and `notify('message', 'success')` for confirmations. Keep the exact user-facing strings. `window.confirm(...)` in `PatientList.tsx:30` stays (a confirm needs a blocking yes/no — do not convert it to a toast).

- [ ] **Step 4: Verify**

```bash
grep -rn "alert(" pages/
npx tsc --noEmit
```
Expected: grep returns nothing (only `window.confirm` remains, which is a different call). No new tsc errors. Manual: save a prescription → green toast; trigger a save error (e.g. stop the backend) → red toast.

- [ ] **Step 5: Commit**

```bash
git add context/ToastContext.tsx index.tsx pages/
git commit -m "feat: replace native alerts with toast notifications"
```

### Task 9: Accessibility pass (aria-labels, alt text, login inputs, reduced motion, theme meta)

**Files:**
- Modify: `index.html` (theme-color, color-scheme meta)
- Modify: `pages/Login.tsx` (autocomplete/type)
- Modify: patient-image sites: `pages/Dashboard.tsx`, `pages/Consultations.tsx`, `pages/NewConsultation.tsx`, `pages/NewPatient.tsx`, `pages/PatientDetail.tsx`, `pages/Reports.tsx`, `components/Layout.tsx`
- Modify: icon-only buttons across pages (see step 3)

**Interfaces:** none.

- [ ] **Step 1: Add meta tags to `index.html`**

In `<head>` add:
```html
    <meta name="theme-color" content="#d3b3a8">
```
And add `style="color-scheme: light"` to the `<html>` tag (the app is a light-only design; declaring it prevents form controls from rendering in forced dark on some browsers).

- [ ] **Step 2: Fix login inputs in `pages/Login.tsx`**

On the email `<input>` add `autoComplete="email"` and `spellCheck={false}`; on the password `<input>` add `autoComplete="current-password"`. (Both already have `type="email"`/`type="password"`.)

- [ ] **Step 3: Add `aria-label` to icon-only buttons**

For every `<button>` whose only visible child is a lucide icon (no text), add a Spanish `aria-label` describing the action. Concrete sites (verify each by reading its surrounding JSX): the mobile menu toggle in `Layout.tsx:167` (`aria-label="Abrir menú"`), the file-remove `X` buttons, the expand/detail toggles, the print/back buttons in `PrintReport.tsx:78,81` (`aria-label="Volver"`, `aria-label="Imprimir"`), and the search-icon links. Grep helper to find candidates: `grep -rn "<button" pages/ components/ | wc -l` then inspect each button that wraps only an icon.

- [ ] **Step 4: Add `alt` text to patient images**

Every `<img src={... foto_perfil ...}>` currently has `alt=""` or no `alt`. Change each to a meaningful alt using the patient's name in scope, e.g. `alt={`Foto de ${patient.nombre_completo}`}` (or `session.patientName`, `p.nombre_completo` depending on the local variable). Decorative-only images that convey nothing may keep `alt=""` with `aria-hidden="true"`, but patient photos are informative — give them names.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npm run build
```
Expected: no new tsc errors; build succeeds. Manual: tab through the login form (visible focus, autofill offered); inspect a few icon buttons in devtools for `aria-label`.

- [ ] **Step 6: Commit**

```bash
git add index.html pages/ components/Layout.tsx
git commit -m "a11y: aria-labels, image alts, login autocomplete, theme meta"
```

---

## Phase E — Clinical workflow features

### Task 10: Appointment status endpoint (backend)

**Files:**
- Modify: `server/routes/appointments.js` (add `PATCH /:id`)
- Modify: `server/smoke-test.js` (assertion)

**Interfaces:**
- Consumes: `query` from `server/db.js`, `assertLengths` from `server/lib/validate.js`, `asyncHandler`.
- Produces: `PATCH /api/appointments/:id` accepting a partial body over the `APPOINTMENT_COLUMNS` whitelist (used to change `estado` to `confirmada`/`cancelada`, or edit fields). Returns 204.

- [ ] **Step 1: Add the PATCH handler**

In `server/routes/appointments.js`, after the POST handler, add (mirrors the `patients.js` PATCH pattern — whitelist-filtered, parameterized, empty-body guarded):
```js
router.patch('/:id', asyncHandler(async (req, res) => {
  assertLengths(req.body);
  const keys = APPOINTMENT_COLUMNS.filter((c) => c !== 'id' && req.body[c] !== undefined);
  if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' });
  const sets = keys.map((k, i) => `${k} = $${i + 2}`);
  const values = keys.map((k) => req.body[k]);
  await query(`UPDATE appointments SET ${sets.join(', ')} WHERE id = $1`, [req.params.id, ...values]);
  res.status(204).end();
}));
```
Ensure `asyncHandler` and `assertLengths` are imported at the top (add if missing).

- [ ] **Step 2: Smoke-test assertion**

In `server/smoke-test.js` (with admin token): POST an appointment, then PATCH its `estado` to `confirmada`, then GET the list and assert that appointment's `estado === 'confirmada'`:
```js
  const apptId = crypto.randomUUID();
  await call('/appointments', { method: 'POST', body: JSON.stringify({ id: apptId, paciente_nombre: 'Smoke Cita', especialidad: 'derm', fecha_preferida: '2026-08-01', hora_preferida: '10:00', motivo: 'test', estado: 'pendiente', created_at: new Date().toISOString() }) }, token);
  const patchAppt = await call(`/appointments/${apptId}`, { method: 'PATCH', body: JSON.stringify({ estado: 'confirmada' }) }, token);
  assert.equal(patchAppt.status, 204);
  const appts = await call('/appointments', {}, token);
  assert.equal(appts.body.find((a) => a.id === apptId).estado, 'confirmada', 'appointment status should update');
  console.log('appointment status update works');
```

- [ ] **Step 3: Verify**

```bash
npm run server   # background
SMOKE_ADMIN_EMAIL=gucci7up@gmail.com SMOKE_ADMIN_PASSWORD="Gucci1826" node server/smoke-test.js
```
Expected: `appointment status update works` + `ALL SMOKE TESTS PASSED`. Stop server.

- [ ] **Step 4: Commit**

```bash
git add server/routes/appointments.js server/smoke-test.js
git commit -m "feat: appointment status update endpoint"
```

### Task 11: Doctor-side appointment create + status controls (frontend)

**Files:**
- Modify: `services/db.ts` (add `DB.appointments.updateStatus`)
- Modify: `pages/Consultations.tsx` (add "Nueva Cita" form + confirm/cancel controls; remove dead dev-comment block and dead buttons)

**Interfaces:**
- Consumes: `api` from `services/api.ts`; `PATCH /api/appointments/:id` (Task 10).
- Produces: `DB.appointments.updateStatus(id, estado)`.

Context: `Consultations.tsx:211-227` contains a large stream-of-consciousness dev comment left in production; `Consultations.tsx:96` ("Ver Historial Completo") and `:254` ("Configurar Agenda Externa") are dead buttons with no handler. Appointments can currently only be created from the public Landing — the doctor has no in-app way to add or triage a booking.

- [ ] **Step 1: Add `updateStatus` to `services/db.ts`**

In the `appointments` block of `DB`, add:
```ts
    updateStatus: async (id: string, estado: 'pendiente' | 'confirmada' | 'cancelada') => {
      await api(`/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ estado }) });
    },
```

- [ ] **Step 2: Add a "Nueva Cita" create form in `Consultations.tsx`**

Add local state for a small appointment form (`paciente_nombre`, `paciente_telefono`, `especialidad`, `fecha_preferida`, `hora_preferida`, `motivo`). Render a form (styled to match the existing dark "Iniciar Consulta" card) whose submit calls `DB.appointments.save({ id: crypto.randomUUID(), estado: 'pendiente', created_at: new Date().toISOString(), ...form })`, then re-loads the appointments list and shows a success toast (`useToast` from Task 8). Reuse the robust React-controlled-input pattern already in the codebase.

- [ ] **Step 3: Add confirm/cancel controls to each agenda item**

In the "Agenda Próxima" list, replace the single "Registrar y Atender" button with two small buttons per appointment: "Confirmar" (calls `DB.appointments.updateStatus(app.id, 'confirmada')`) and "Cancelar" (calls `updateStatus(app.id, 'cancelada')`), each followed by a list reload + toast. Keep the existing "Registrar y Atender" prefill-to-new-patient action as a third action. Show the current `estado` as a colored badge.

- [ ] **Step 4: Remove dead code**

Delete the multi-line dev comment block at `Consultations.tsx:211-227`. Remove the dead "Ver Historial Completo" button (`:96`) and "Configurar Agenda Externa" button (`:254`) — or wire the former to nothing meaningful yet, so prefer deletion (YAGNI).

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npm run build
```
Expected: no new tsc errors; build succeeds. Manual after deploy: on Consultas, add a new appointment → appears in Agenda Próxima; click Confirmar → badge turns confirmed and it persists across reload; click Cancelar → it drops out of the non-cancelled list.

- [ ] **Step 6: Commit**

```bash
git add services/db.ts pages/Consultations.tsx
git commit -m "feat: doctor-side appointment creation and status triage"
```

### Task 12: Verify and polish the existing before/after photo flow

**Files:**
- Modify: `pages/NewConsultation.tsx` and/or `pages/PatientDetail.tsx` only if a defect is found.

**Interfaces:** none new. Photos already store as base64 strings in `sessions.fotos_comparativas` (JSONB array); `NewConsultation.tsx:204` uploads, `PatientDetail.tsx:725-730` displays.

Rationale: the before/after photo feature the user asked for already exists end to end. Per YAGNI, this task verifies it works against the migrated backend rather than rebuilding it, and only fixes concrete defects found.

- [ ] **Step 1: Verify the round-trip against the real backend**

Start the server. Log in via the UI (or curl). In NewConsultation for the existing test patient, upload 1–2 images and save. Then open the patient's detail page and confirm the images render in the sessions section. Confirm via network tab that the `POST /api/sessions` body carried the base64 array and `GET /api/sessions?paciente_id=…` returned it intact (JSONB round-trip — already covered by the Task 8 smoke test of the migration, this is a UI-level confirmation).

- [ ] **Step 2: Add a size guard if missing**

Base64 images in JSONB can be large. Confirm Task 5's `assertLengths` (default 20000 chars) does not reject legitimate photos — a single compressed clinical photo base64 easily exceeds 20000 chars. If it does reject them, raise the `max` for the sessions route specifically: in `crudRouter.js`, allow the sessions config to pass a higher `maxBodyChars` (e.g. 5_000_000) and have `assertLengths(req.body, maxBodyChars)` use it. Wire `maxBodyChars` through `createClinicalRouter({ ... })` for the `sessions` resource in `clinical.js`. Only do this if Step 1 shows photos being rejected.

- [ ] **Step 3: Verify**

Manual: the upload→save→view round trip works with real image files; no 400 from the length guard.

- [ ] **Step 4: Commit (only if changes were made)**

```bash
git add server/lib/crudRouter.js server/routes/clinical.js
git commit -m "fix: allow base64 photos through the length guard on sessions"
```
If no defect was found, record in the report that the existing flow is verified and skip the commit.

### Task 13: Reliable per-patient PDF export

**Files:**
- Modify: `pages/PrintReport.tsx` (label the action as PDF; ensure clean print CSS)
- Modify: `pages/PatientDetail.tsx` (ensure a clearly labeled "Exportar PDF" entry to the print view)

**Interfaces:** none new. Uses the browser's native print-to-PDF (`window.print()`), which `PrintReport.tsx` already invokes — no new PDF library (YAGNI).

Rationale: `PrintReport.tsx` already renders a clean printable expediente and auto-calls `window.print()`. The requested "PDF del expediente por paciente" is satisfied by print-to-PDF; this task makes it explicit and reliable rather than adding a heavyweight PDF-generation dependency.

- [ ] **Step 1: Make the print action explicitly offer PDF**

In `PrintReport.tsx`, relabel the on-screen "Imprimir Ahora" button to "Descargar / Imprimir PDF" and add `aria-label`. Confirm the `print:hidden` / `print:p-0` classes already scope the print layout (they do). Verify the 1s auto-`window.print()` timer (`:52`) does not fire before data loads — it is already gated on `patient && settings`.

- [ ] **Step 2: Ensure the entry point is discoverable from the patient**

In `PatientDetail.tsx`, confirm there is a visible control linking to `/patients/:id/print` labeled for export (the header already has print/report actions — relabel the print one to "Exportar PDF" and give it an `aria-label`). No new route needed.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```
Expected: no new tsc errors. Manual after deploy: from a patient, click "Exportar PDF" → print view opens → browser print dialog → "Save as PDF" produces a clean document with the (now-fixed, Task 3) logo and signature.

- [ ] **Step 4: Commit**

```bash
git add pages/PrintReport.tsx pages/PatientDetail.tsx
git commit -m "feat: explicit per-patient PDF export via print-to-PDF"
```

---

## Final verification

After all tasks: redeploy the branch to Dokploy, run the full smoke test against the deployed backend, and do a manual walkthrough (login → dashboard shows real name+stats → create appointment + confirm → patient with photo session → export PDF with logo/signature → settings change persists → logout). Confirm the browser console shows no Tailwind-CDN warning and no errors. Then finish the branch (merge to main).
