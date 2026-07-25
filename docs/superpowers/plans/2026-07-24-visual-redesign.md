# Rediseño Visual Boutique Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recolorear y retipografiar toda la app (frontend React/Tailwind) de la paleta "slate/azul corporativo" actual a una paleta cálida boutique (terracota + arena) con tipografía serif en títulos, sin tocar lógica, rutas, ni estructura de datos.

**Architecture:** Dos escalas de color completas (`terracotta` 50-900, `sand` 50-900) definidas en `tailwind.config.js` calzan tono-a-tono con las escalas `blue`/`slate` de Tailwind que la app ya usa, más dos hex hardcodeados (`#d3b3a8`/`#c4a499`) que se reemplazan por valores fijos. Esto permite que el recoloreado masivo sea una sustitución de texto determinística (`slate`→`sand`, `blue`→`terracotta`) en vez de mapear cientos de ocurrencias una por una. Un pase manual separado agrega `font-serif` a títulos.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS (compilado vía PostCSS, ya configurado), `@fontsource-variable/fraunces` + `@fontsource/plus-jakarta-sans` (nuevas dependencias, self-hosted, sin CDN).

## Global Constraints

- Paleta exacta (copiar literal en `tailwind.config.js`):
  ```js
  terracotta: {
    50: '#FBF0EA', 100: '#F5DDD0', 200: '#EAC0AC', 300: '#DEA084',
    400: '#D07F5C', 500: '#C4693F', DEFAULT: '#C15F3C', 600: '#C15F3C',
    700: '#8C4429', 800: '#723620', 900: '#5C2C1A',
  },
  sand: {
    50: '#FBF6EF', 100: '#F5EDE0', 200: '#EEE2CE', 300: '#E8DCC8',
    400: '#D6C4A8', 500: '#B8A688', 600: '#93826A', 700: '#6B5A48',
    800: '#4F4237', 900: '#3A322C',
  },
  ```
- Tipografía: `Fraunces` (serif, variable) en `font-serif`, `Plus Jakarta Sans` en `font-sans` (default).
- Ningún cambio de lógica, rutas, roles, ni estructura de datos — solo clases Tailwind y `tailwind.config.js`/`src/index.css`.
- Los colores semánticos de estado (`emerald-*`/`amber-*`/`red-*` en badges de cita) NO se tocan — no son `slate`/`blue`, quedan igual.
- No se instala ningún sistema de theming nuevo (CSS vars, context) — la paleta es fija.

---

### Task 1: Fundación — paleta y tipografía en Tailwind

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css`
- Modify: `package.json` (nuevas dependencias)

**Interfaces:**
- Produces: clases Tailwind `bg-terracotta-{50..900}`, `text-terracotta`, `bg-sand-{50..900}`, `font-serif`, `font-sans` — usadas por Task 2 y Task 3.

- [ ] **Step 1: Instalar las fuentes**

```bash
npm install @fontsource-variable/fraunces @fontsource/plus-jakarta-sans
```

- [ ] **Step 2: Actualizar `tailwind.config.js`**

Contenido completo del archivo:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './**/*.{ts,tsx}', '!./node_modules/**'],
  theme: {
    extend: {
      colors: {
        terracotta: {
          50: '#FBF0EA', 100: '#F5DDD0', 200: '#EAC0AC', 300: '#DEA084',
          400: '#D07F5C', 500: '#C4693F', DEFAULT: '#C15F3C', 600: '#C15F3C',
          700: '#8C4429', 800: '#723620', 900: '#5C2C1A',
        },
        sand: {
          50: '#FBF6EF', 100: '#F5EDE0', 200: '#EEE2CE', 300: '#E8DCC8',
          400: '#D6C4A8', 500: '#B8A688', 600: '#93826A', 700: '#6B5A48',
          800: '#4F4237', 900: '#3A322C',
        },
      },
      fontFamily: {
        serif: ['Fraunces Variable', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

- [ ] **Step 3: Actualizar `src/index.css`**

Contenido completo del archivo:

```css
@import '@fontsource-variable/fraunces';
@import '@fontsource/plus-jakarta-sans';

@tailwind base;
@tailwind components;
@tailwind utilities;

body { font-family: 'Plus Jakarta Sans', sans-serif; }
```

- [ ] **Step 4: Verificar que el dev server arranca sin errores**

Run: `npm run dev` (o el script equivalente en `package.json`), abrir `http://localhost:5173` (o el puerto configurado) en el navegador.
Expected: la app carga sin errores en consola relacionados a fuentes o Tailwind. El look visual todavía NO cambia (los componentes siguen usando `slate`/`blue` — eso lo hace Task 2). Detener el server luego de verificar.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js src/index.css package.json package-lock.json
git commit -m "feat: add terracotta/sand color scales and Fraunces/Plus Jakarta Sans fonts"
```

---

### Task 2: Sustitución masiva de tokens de color

**Files:**
- Modify (vía script, todos los `.tsx` bajo `pages/` y `components/`, más `App.tsx`): actualmente son estos 18 archivos —
  `App.tsx`, `components/AppointmentCard.tsx`, `components/AppointmentForm.tsx`, `components/AuthGuard.tsx`, `components/ErrorBoundary.tsx`, `components/Layout.tsx`, `pages/Agenda.tsx`, `pages/Consultations.tsx`, `pages/Dashboard.tsx`, `pages/Landing.tsx`, `pages/Login.tsx`, `pages/NewConsultation.tsx`, `pages/NewPatient.tsx`, `pages/PatientDetail.tsx`, `pages/PatientList.tsx`, `pages/Prescription.tsx`, `pages/PrintReport.tsx`, `pages/Reports.tsx`, `pages/Schedule.tsx`, `pages/Settings.tsx`
- Create (temporal, se borra al final del task, NO se commitea): `scripts/apply-color-tokens.mjs`

**Interfaces:**
- Consumes: `terracotta-{50..900}` y `sand-{50..900}` de Task 1.

- [ ] **Step 1: Crear el script de sustitución**

Crear `scripts/apply-color-tokens.mjs`:

```js
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const targets = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) targets.push(p);
  }
}
walk('pages');
walk('components');
targets.push('App.tsx');

let changed = 0;
for (const file of targets) {
  const original = readFileSync(file, 'utf8');
  const updated = original
    .replaceAll('#d3b3a8', '#C15F3C')
    .replaceAll('#c4a499', '#8C4429')
    .replace(/\bslate-(\d{2,3})\b/g, 'sand-$1')
    .replace(/\bblue-(\d{2,3})\b/g, 'terracotta-$1');
  if (updated !== original) {
    writeFileSync(file, updated);
    changed++;
    console.log('updated', file);
  }
}
console.log(`Total files updated: ${changed}`);
```

- [ ] **Step 2: Ejecutar el script**

Run: `node scripts/apply-color-tokens.mjs`
Expected: imprime `updated <archivo>` para cada uno de los 18 archivos listados arriba, y termina con `Total files updated: 18` (puede variar en ±1 si algún archivo no tenía ocurrencias — verificar contra la lista).

- [ ] **Step 3: Verificar que no quedan tokens viejos**

Run:
```bash
grep -rE "\bslate-[0-9]{2,3}\b" pages components App.tsx
grep -rE "\bblue-[0-9]{2,3}\b" pages components App.tsx
grep -rn "#d3b3a8\|#c4a499" pages components App.tsx
```
Expected: las tres búsquedas devuelven vacío (sin matches, exit code 1 de grep).

- [ ] **Step 4: Borrar el script temporal**

```bash
rm scripts/apply-color-tokens.mjs
```

- [ ] **Step 5: Verificar visualmente**

Run: `npm run dev`, abrir la app en el navegador, loguearse, navegar por Dashboard, Pacientes, un expediente de paciente (`PatientDetail`), Consultas, Agenda, y Schedule (como secretaria si hay cuenta de prueba, o revisar el código).
Expected: toda la app muestra la paleta terracota/arena en vez de azul/slate — fondos cálidos, acentos terracota en botones/badges/focus rings, sin fondos ni textos azules o gris-slate remanentes. Sin errores de consola. Los badges de estado de cita (pendiente/confirmada/cancelada, con/sin seguro) se ven correctos con sus colores semánticos verde/ámbar/rojo intactos.

- [ ] **Step 6: Commit**

```bash
git add pages components App.tsx
git commit -m "style: replace slate/blue color tokens with terracotta/sand palette"
```

---

### Task 3: Tipografía — serif en títulos

**Files:**
- Modify: todo archivo con etiquetas `<h1`, `<h2`, o `<h3` — actualmente estos 16 archivos:
  `components/AppointmentForm.tsx`, `components/ErrorBoundary.tsx`, `components/Layout.tsx`, `pages/Agenda.tsx`, `pages/Consultations.tsx`, `pages/Dashboard.tsx`, `pages/Landing.tsx`, `pages/Login.tsx`, `pages/NewConsultation.tsx`, `pages/NewPatient.tsx`, `pages/PatientDetail.tsx`, `pages/PatientList.tsx`, `pages/PrintReport.tsx`, `pages/Reports.tsx`, `pages/Schedule.tsx`, `pages/Settings.tsx`
- Also modify: `components/AppointmentCard.tsx:59` (nombre de paciente en la card, actualmente `<p className="text-sm font-black text-sand-900 group-hover:text-terracotta-700 transition-colors">{appointment.paciente_nombre}</p>` tras Task 2 — es el título visual de la card aunque la etiqueta sea `<p>`)

**Interfaces:**
- Consumes: `font-serif` de Task 1.

- [ ] **Step 1: Ubicar cada etiqueta de título**

Run: `grep -rn "<h1\|<h2\|<h3" pages components` para confirmar la lista completa antes de editar (la lista de arriba es la conocida al momento de escribir este plan; si el grep muestra alguna etiqueta adicional, inclúyela también).

- [ ] **Step 2: Agregar `font-serif` a la clase de cada etiqueta de título**

Para cada `<h1 className="...">`, `<h2 className="...">`, `<h3 className="...">` encontrado, agregar `font-serif` al inicio (o en cualquier posición) del string de `className`. Ejemplo concreto en `pages/PatientDetail.tsx:202`:

Antes:
```tsx
<h1 className="text-3xl font-black text-sand-900 leading-tight">{patient.nombre_completo}</h1>
```
Después:
```tsx
<h1 className="font-serif text-3xl font-black text-sand-900 leading-tight">{patient.nombre_completo}</h1>
```

Aplicar el mismo patrón (agregar `font-serif` al `className` existente, sin quitar nada) a cada `<h1>`/`<h2>`/`<h3>` de la lista, y al `<p>` de `AppointmentCard.tsx:59` señalado arriba.

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev`, revisar las mismas pantallas del Task 2 Step 5.
Expected: todos los títulos de página, nombres de paciente en cards/expediente, y encabezados de sección se ven en la tipografía serif (Fraunces) — visiblemente distinta de los labels/botones/texto de cuerpo (que siguen en Plus Jakarta Sans).

- [ ] **Step 4: Commit**

```bash
git add pages components
git commit -m "style: apply Fraunces serif to headings and patient names"
```

---

### Task 4: Revisión final, deploy y merge

- [ ] Dispatch del reviewer final de rama completa (`superpowers:requesting-code-review`), con foco en: paleta aplicada consistentemente (sin `slate-`/`blue-`/`#d3b3a8`/`#c4a499` remanentes), contraste de texto legible en todos los fondos nuevos (terracota sobre blanco, arena oscuro sobre arena claro), y que ningún cambio de lógica/ruta se haya colado.
- [ ] Aplicar fixes de hallazgos Critical/Important si los hay, re-revisar.
- [ ] Deploy a Dokploy (rama `visual-redesign`) y verificación en vivo en navegador: login, Dashboard, Pacientes, expediente de un paciente real, Consultas, Agenda (doctor), Schedule (secretaria) — confirmar visualmente la paleta boutique en producción, sin errores de consola.
- [ ] Merge a `main` con confirmación del usuario.
