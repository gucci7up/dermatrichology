# Rediseño Visual Boutique — Design Spec

Fecha: 2026-07-24
Estado: aprobado, pendiente de plan de implementación

## Contexto

Fase 2 del pedido original de restructuración visual (Fase 1: roles y agenda,
ya mergeada — ver `docs/superpowers/specs/2026-07-24-roles-and-agenda-design.md`).
Este spec cubre **solo** el sistema visual (color, tipografía, componentes
compartidos) — no toca lógica, rutas, ni estructura de datos.

La app hoy usa un estilo "slate oscuro/corporativo" (fondos `slate-900`,
bordes `slate-300`, tipografía sans única) definido de forma repetida e
inline en cada página (ver `pages/Consultations.tsx`, `components/Layout.tsx`,
`components/AppointmentCard.tsx`, etc. — no hay tokens centralizados en
`tailwind.config`).

## Dirección visual aprobada

**Estilo:** clínica boutique / cálido — menos "hospital corporativo", más
consultorio premium.

**Paleta** (nuevos tokens en `tailwind.config.js`, bajo `theme.extend.colors`).

Corrección post-exploración de código: el uso real de color en la app no es
un solo tono de acento y un solo neutro — usa las escalas numeradas
completas de Tailwind (`slate-50` a `slate-900`, `blue-50` a `blue-700`) en
decenas de variantes (fondos, bordes, focus rings, sombras, badges). Para
poder reemplazar esto con una sustitución de texto simple y determinística
(un solo find/replace de `slate`→`sand` y `blue`→`terracotta`, sin mapear
tono por tono), la paleta se define como dos escalas completas de 50 a 900
que calzan 1:1 con la forma de las escalas de Tailwind que reemplazan:

```js
colors: {
  terracotta: {
    50: '#FBF0EA', 100: '#F5DDD0', 200: '#EAC0AC', 300: '#DEA084',
    400: '#D07F5C', 500: '#C4693F',
    DEFAULT: '#C15F3C', 600: '#C15F3C', // acento primario: botones, badges, focus rings
    700: '#8C4429', // hover, texto de énfasis (reemplaza blue-700)
    800: '#723620', 900: '#5C2C1A',
  },
  sand: {
    50: '#FBF6EF',  // fondo base de página (reemplaza slate-50)
    100: '#F5EDE0', 200: '#EEE2CE',
    300: '#E8DCC8', // bordes/dividers (reemplaza slate-200/slate-300)
    400: '#D6C4A8', 500: '#B8A688', 600: '#93826A', 700: '#6B5A48',
    800: '#4F4237',
    900: '#3A322C', // texto principal (reemplaza slate-900)
  },
}
```

`bg-sand-50` es el fondo crema de página; `text-sand-900` es el texto
principal (antes `text-slate-900`); `bg-terracotta`/`bg-terracotta-600` es
el CTA primario (antes `bg-blue-600`); `terracotta-700` es el hover/dark
(antes `blue-700`). Los shades 100/200/400/500/800 quedan disponibles para
los usos existentes de esas mismas posiciones en `slate-*`/`blue-*`
(badges suaves, bordes claros, texto secundario, sombras) sin necesitar
mapeo manual — cada `slate-N` pasa a `sand-N` y cada `blue-N` pasa a
`terracotta-N`, mismo N.

Los estados semánticos (éxito=verde, pendiente=ámbar, error=rojo, ya usados
en badges de estado de cita) se mantienen — solo se desaturan levemente para
no chocar con la paleta cálida (usar los mismos `emerald-`/`amber-`/`red-`
de Tailwind que ya están en uso, sin tokens nuevos).

**Tipografía** (self-hosted vía `@fontsource`, sin CDN):
- Títulos (`h1`-`h3`, nombres de paciente en cards, headers de sección):
  `Fraunces` (serif cálida variable)
- Texto, labels, botones, UI en general: `Plus Jakarta Sans`

`tailwind.config.js` gana:
```js
fontFamily: {
  serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
  sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
}
```

Se instalan `@fontsource-variable/fraunces` y `@fontsource/plus-jakarta-sans`
(ya hay precedente de fuentes self-hosted vía npm en el proyecto desde la
migración de Tailwind CDN→compilado); se importan una vez en `index.tsx` o
`index.css`.

## Alcance

Toda la app en un solo pase: `Dashboard`, `Patients`, `PatientDetail`,
`NewPatient`, `Consultations`, `Reports`, `Schedule`, `Agenda`, `Settings`,
`Layout` (sidebar/nav), y los componentes compartidos `AppointmentForm`,
`AppointmentCard`. Ningún cambio de estructura/layout/rutas — solo
recoloreado + retipografiado.

## Estrategia de implementación

**No hay componente de theming centralizado hoy** — cada página define sus
propias clases Tailwind inline (`bg-slate-900`, `rounded-[2rem] border-slate-300`,
etc., repetidas con variaciones menores en cada archivo). Reescribir cada
archivo a mano para introducir tokens nuevos es el camino más simple y
consistente con el patrón ya existente en el proyecto (no se introduce un
sistema de theming nuevo — sería sobre-ingeniería para una sola paleta).

Por archivo, el cambio es mecánico — tres sustituciones de texto exactas,
aplicadas a cada ocurrencia en todo el árbol de `pages/` y `components/`
(más `App.tsx`) sin excepciones ni mapeo caso por caso, gracias a que las
escalas `sand`/`terracotta` calzan tono a tono con `slate`/`blue`:

| Antes | Después | Alcance |
|---|---|---|
| token `slate` (en cualquier clase: `bg-slate-900`, `text-slate-600`, `border-slate-200`, `divide-slate-200`, `ring-slate-300`, etc.) | token `sand` (misma clase, mismo N: `bg-sand-900`, `text-sand-600`, `border-sand-200`, ...) | todo `pages/*.tsx`, `components/*.tsx`, `App.tsx` |
| token `blue` (en cualquier clase: `bg-blue-600`, `text-blue-700`, `ring-blue-500`, `shadow-blue-500`, `accent-blue-600`, etc.) | token `terracotta` (misma clase, mismo N) | ídem |
| hex hardcodeado `#d3b3a8` (acento primario actual — logo, activo de sidebar, ~97 usos en `Layout.tsx`, `Login.tsx`, `Landing.tsx`, `Dashboard.tsx`, `PatientList.tsx`, `PatientDetail.tsx`, `NewPatient.tsx`, `NewConsultation.tsx`, `Settings.tsx`, `App.tsx`, `AuthGuard.tsx`, `ErrorBoundary.tsx`) y su hover `#c4a499` (~10 usos) | `#C15F3C` (terracotta-600) y `#8C4429` (terracotta-700) respectivamente | mismos archivos |

`bg-white` como fondo de card sobre `bg-sand-50` no cambia (ya contrasta).
`font-black` en `h1`/`h2`/`h3`/nombres de paciente destacados gana además
`font-serif` (Fraunces ya es variable, el peso lo da el propio font-weight
de Tailwind) — este paso es manual, no mecánico, porque requiere distinguir
títulos de texto de cuerpo. El resto de texto/labels/botones no cambia de
familia (Plus Jakarta Sans ya es el default vía `font-sans`).

Bordes redondeados grandes (`rounded-[2rem]`, `rounded-2xl`, `rounded-3xl`)
ya están en uso extensivo — se mantienen tal cual, encajan con el estilo
boutique sin cambios.

`components/Layout.tsx` (sidebar): ya usa `bg-white`/`slate-100` (claro),
no oscuro — la sustitución mecánica sola alcanza (`slate-100`→`sand-100`,
`#d3b3a8`→terracotta), sin cambio manual adicional.

Badges de estado de cita (`Con Seguro`/`Sin Seguro`, `pendiente`/`confirmada`/
`cancelada` en `AppointmentCard.tsx`) mantienen su lógica semántica de color
(verde/ámbar/rojo/neutro) — el neutro/default pasa de `slate-*` a `sand-*`
vía la sustitución mecánica, sin cambio manual adicional.

## Fuera de alcance

- Cambios de layout, rutas, o lógica de negocio (ya resuelto en Fase 1).
- Iconografía nueva — se mantiene `lucide-react`, solo cambia el color con el
  que se renderizan los iconos existentes.
- Dark mode — no fue pedido.
- Sistema de theming/design-tokens abstracto (CSS variables, context de tema,
  etc.) — una sola paleta fija no lo justifica.

## Ampliación (Fase 2b): rediseño de layout y componentes

Tras ver la app con la paleta/tipografía nueva (Fase 2a, mergeada), la
doctora pidió más — no solo recoloreado, sino una reestructuración visual
real: layout, espaciado/sombras, componentes (botones/cards/inputs), y
elementos decorativos. Esto amplía el "Fuera de alcance" original: ahora SÍ
se tocan layout y componentes compartidos, con la paleta/tipografía de Fase
2a como base ya fija (no cambian).

**Alcance de esta ampliación:** `pages/Login.tsx` y `pages/Dashboard.tsx`
primero, para validar el nuevo lenguaje visual antes de replicarlo al resto
de la app (Pacientes, Consultas, Agenda, Schedule, Reportes, Settings,
Landing) en una fase posterior separada.

Direcciones elegidas por la doctora (proceso de brainstorming con mockups
visuales, tres decisiones):

**1. Layout — "Bento cálido":** grid asimétrico con bloque "hero" de ancho
completo en la parte superior (fondo degradado `terracotta-700`→`terracotta-900`,
texto blanco, esquinas muy redondeadas `rounded-[28px]`/`rounded-3xl`) seguido
de un grid de stat-cards debajo (ej. 3 columnas: Pacientes / Esta semana /
Alertas, o proporciones asimétricas 1.4fr/1fr si el contenido lo pide). Cards
elevadas con sombra suave (`shadow-sm`/`shadow-md`, no `shadow-xl` — sutil,
no pesada).

**2. Componentes — "Definido / con borde":**
- **Cards:** `bg-white border border-sand-300 rounded-2xl shadow-sm p-6`
  (o `p-8` en cards principales) — reemplaza el `rounded-[2rem]
  border-slate-300 shadow-md` genérico usado hoy en casi todas las
  secciones. Esquina media (`rounded-2xl` = 16px), no la esquina extrema
  actual.
- **Botones primarios:** `bg-terracotta-700 hover:bg-terracotta-800
  text-white font-bold rounded-xl px-6 py-3` — rectangular con esquina
  media, NO píldora (`rounded-full` descartado en el mockup).
- **Botones secundarios/outline:** `bg-transparent text-terracotta-800
  border-[1.5px] border-terracotta-800 rounded-xl px-6 py-3
  hover:bg-terracotta-50`.
- **Inputs:** caja con borde visible, label arriba (no flotante):
  `<label class="block text-[10px] font-bold uppercase tracking-wide
  text-sand-700 mb-1">` seguido de `<input class="w-full border-[1.5px]
  border-sand-300 rounded-xl bg-white px-3 py-2.5 text-sm
  focus:border-terracotta-600 focus:ring-2 focus:ring-terracotta-100
  outline-none">`.

**3. Motivo decorativo — "Líneas orgánicas finas":** dentro de bloques con
fondo degradado terracota (el hero del Dashboard, el panel del Login), un
SVG decorativo posicionado en `absolute inset-0` con `opacity: 0.12-0.15`,
compuesto de 2-3 trazos ondulados (`<path>` con curvas suaves tipo onda) y
1-2 círculos finos sin relleno (`stroke`, sin `fill`) — evoca textura de
piel/cabello de forma abstracta, sin ser literal ni un blob genérico. NO
usar fotos de stock ni iconografía médica clichê (cruces, estetoscopios de
fondo, etc.).

**Espaciado:** cards principales pasan de `p-4`/`p-6` a `p-6`/`p-8`; el gap
entre elementos de grid pasa de `gap-4`/`gap-6` a `gap-4`/`gap-5` en grids
densos y `gap-6`/`gap-8` en layouts abiertos tipo hero+stats.

**`pages/Login.tsx`:** aplica el mismo hero decorativo (como panel lateral
en desktop o header en mobile, según el layout actual del archivo — sin
alterar la lógica de autenticación) y los componentes nuevos (inputs con
caja, botón primario rectangular).

**`pages/Dashboard.tsx`:** hero de bienvenida ("Buen día, Dra. {nombre}")
con el degradado+SVG decorativo, debajo el grid de stat-cards con el nuevo
estilo de card, manteniendo los datos/lógica actuales (no se agregan ni
quitan métricas — solo se reestructura visualmente cómo se muestran).

**Fuera de alcance de esta ampliación:** todo lo que no sea Login/Dashboard
(queda para una fase posterior, una vez aprobado el resultado en estas dos
pantallas); fotos reales (la doctora no tiene fotos listas todavía — se usa
el motivo SVG decorativo en su lugar); cualquier cambio de lógica, rutas, o
estructura de datos (sigue fuera de alcance, igual que en Fase 2a).
