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

**Paleta** (nuevos tokens en `tailwind.config.js`, bajo `theme.extend.colors`):

```js
colors: {
  cream: {
    DEFAULT: '#FBF6EF', // fondo base de página
    card: '#FAF3E9',    // fondo alterno de tarjetas
  },
  terracotta: {
    DEFAULT: '#C15F3C', // acento primario: botones, badges activos, iconos
    dark: '#8C4429',    // hover, texto de énfasis
  },
  charcoal: '#3A322C',  // texto principal (reemplaza slate-900 en texto)
  sand: '#E8DCC8',      // bordes/dividers (reemplaza slate-200/300)
}
```

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

Por archivo, el cambio es mecánico: buscar y reemplazar las clases de color
Tailwind actuales por los nuevos tokens equivalentes:

| Antes (slate) | Después |
|---|---|
| `bg-slate-900` (fondos oscuros, sidebar, cards destacadas) | `bg-charcoal` |
| `bg-white` (fondo de página) | `bg-cream` |
| `bg-white` (fondo de card sobre bg-cream) | `bg-white` o `bg-cream-card` (sin cambio si ya contrasta) |
| `border-slate-200`/`border-slate-300` | `border-sand` |
| `text-slate-900` (texto principal) | `text-charcoal` |
| `text-blue-600`/`bg-blue-600` (acento/CTA) | `text-terracotta`/`bg-terracotta` |
| `hover:bg-black`/`hover:text-blue-800` | `hover:bg-terracotta-dark` |
| `font-black` en `h1`/`h2`/`h3`/nombres destacados | agregar `font-serif` (Fraunces ya es variable, el peso lo define el propio font-weight de Tailwind) |
| Resto de texto/labels/botones | sin cambio de familia (Plus Jakarta Sans queda como `font-sans`, ya es el default de Tailwind) |

Bordes redondeados grandes (`rounded-[2rem]`, `rounded-2xl`, `rounded-3xl`)
ya están en uso extensivo — se mantienen tal cual, encajan con el estilo
boutique sin cambios.

`components/Layout.tsx` (sidebar): fondo pasa de oscuro a `bg-cream` (o
`bg-white` si el sidebar necesita diferenciarse del body), item de menú
activo usa `bg-terracotta text-white` en vez del acento actual.

Badges de estado de cita (`Con Seguro`/`Sin Seguro`, `pendiente`/`confirmada`/
`cancelada` en `AppointmentCard.tsx`) mantienen su lógica semántica de color
(verde/ámbar/rojo/neutro) — solo el neutro/default pasa de slate a sand/charcoal.

## Fuera de alcance

- Cambios de layout, rutas, o lógica de negocio (ya resuelto en Fase 1).
- Iconografía nueva — se mantiene `lucide-react`, solo cambia el color con el
  que se renderizan los iconos existentes.
- Dark mode — no fue pedido.
- Sistema de theming/design-tokens abstracto (CSS variables, context de tema,
  etc.) — una sola paleta fija no lo justifica.
