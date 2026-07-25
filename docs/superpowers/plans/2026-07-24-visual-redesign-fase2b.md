# Rediseño de Layout y Componentes (Fase 2b: Login + Dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar el nuevo lenguaje visual "Bento cálido" (layout asimétrico, componentes con borde definido, motivo decorativo de líneas orgánicas) a `pages/Login.tsx` y `pages/Dashboard.tsx`, para validar el estilo antes de replicarlo al resto de la app.

**Architecture:** Cambios acotados a estos dos archivos de página. Se reutiliza el mismo bloque SVG decorativo (líneas onduladas + círculos finos, `opacity-[0.14]`) en ambos, dentro de un contenedor con degradado `from-terracotta-700 to-terracotta-900`. No se crea un componente compartido nuevo para el SVG — son solo dos usos, extraerlo sería sobre-ingeniería (YAGNI); si una fase posterior lo reutiliza en más pantallas, ahí se justifica extraerlo.

**Tech Stack:** React 19 + TypeScript + Tailwind (paleta `terracotta`/`sand` ya definida en `tailwind.config.js` desde Fase 2a).

## Global Constraints

- Paleta y tipografía ya fijas desde Fase 2a (`terracotta`/`sand` 50-900, `font-serif`=Fraunces, `font-sans`=Plus Jakarta Sans) — no se tocan.
- Botones primarios (fill sólido con texto): `bg-terracotta-700` (no `terracotta-600`/`bg-[#C15F3C]`) — ya establecido como regla de accesibilidad en Fase 2a (contraste AA).
- Cards: `bg-white border border-sand-300 rounded-2xl` con sombra suave (`shadow-sm` o `shadow-md`, nunca `shadow-xl`).
- Inputs: caja con borde `border-[1.5px] border-sand-300`, fondo `bg-white`, label arriba (no flotante).
- Ningún cambio de lógica, rutas, ni llamadas a `DB`/`services` — solo JSX/clases de presentación.
- No usar hex hardcodeado (`bg-[#...]`) para colores que ya existen como token en la paleta — usar `bg-terracotta-700`, `text-terracotta-700`, etc.

---

### Task 1: Rediseño de `pages/Login.tsx`

**Files:**
- Modify: `pages/Login.tsx` (archivo completo, 111 líneas)

**Interfaces:**
- Consumes: `terracotta-700`/`terracotta-900`/`terracotta-600`/`terracotta-100` y `font-serif` de Fase 2a. Ningún cambio de props/lógica — `useAuth`, `handleLogin`, estados `email`/`password`/`loading`/`error` se mantienen idénticos.

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

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

    return (
        <div className="min-h-screen bg-sand-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl border border-sand-200 shadow-xl overflow-hidden">
                <div className="relative bg-gradient-to-br from-terracotta-700 to-terracotta-900 px-8 pt-10 pb-8 md:px-10 overflow-hidden">
                    <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-[0.14]" aria-hidden="true">
                        <path d="M0,80 Q100,20 200,80 T400,80" stroke="white" strokeWidth="2" fill="none" />
                        <path d="M0,130 Q100,70 200,130 T400,130" stroke="white" strokeWidth="1.5" fill="none" />
                        <circle cx="340" cy="40" r="24" stroke="white" strokeWidth="1.5" fill="none" />
                        <circle cx="40" cy="160" r="14" stroke="white" strokeWidth="1.5" fill="none" />
                    </svg>
                    <div className="relative text-center">
                        <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-white/20">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="font-serif text-2xl font-black text-white mb-2">Bienvenido</h1>
                        <p className="text-white/80 font-medium">Ingresa tus credenciales para acceder al sistema.</p>
                    </div>
                </div>

                <div className="p-8 md:p-10">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wide text-sand-700 ml-1">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sand-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    spellCheck={false}
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-white border-[1.5px] border-sand-300 rounded-xl text-sand-900 font-bold focus:ring-2 focus:ring-terracotta-100 focus:border-terracotta-600 outline-none transition-all"
                                    placeholder="admin@dermatrich.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wide text-sand-700 ml-1">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sand-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-white border-[1.5px] border-sand-300 rounded-xl text-sand-900 font-bold focus:ring-2 focus:ring-terracotta-100 focus:border-terracotta-600 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-terracotta-700 hover:bg-terracotta-800 text-white py-3.5 rounded-xl font-black text-sm shadow-lg shadow-terracotta-700/30 hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    INGRESANDO...
                                </>
                            ) : (
                                'INICIAR SESIÓN'
                            )}
                        </button>
                    </form>
                </div>
                <div className="bg-sand-50 p-6 text-center border-t border-sand-200">
                    <p className="text-xs text-sand-400 font-semibold">
                        Dermatrichology App &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
```

- [ ] **Step 2: Verificar visualmente**

Run: `npm run dev`, abrir `/login` (o la ruta raíz si no hay sesión activa) en el navegador.
Expected: la parte superior de la card de login muestra un panel con degradado terracota oscuro y líneas onduladas finas semitransparentes de fondo, el ícono de candado sobre un círculo translúcido blanco, título "Bienvenido" en blanco. Debajo, formulario con inputs de caja blanca bordeada y el botón "INICIAR SESIÓN" en terracota sólido (no negro). El login funcional (submit, error de credenciales) sigue funcionando igual que antes — no se tocó ninguna lógica. Sin errores de consola.

- [ ] **Step 3: Commit**

```bash
git add pages/Login.tsx
git commit -m "style: redesign Login with gradient hero panel and boxed inputs"
```

---

### Task 2: Rediseño de `pages/Dashboard.tsx`

**Files:**
- Modify: `pages/Dashboard.tsx:82-98` (bloque de encabezado) y `pages/Dashboard.tsx:93` (botón "Nuevo Paciente")

**Interfaces:**
- Consumes: mismo SVG decorativo del Task 1 (duplicado inline, no compartido — ver Architecture). Ningún cambio a `StatCard`, a la carga de datos, ni a las secciones de tabla/solicitudes debajo del encabezado.

- [ ] **Step 1: Reemplazar el bloque de encabezado (líneas 82-98)**

Antes:
```tsx
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-sand-900 truncate">Bienvenido, {settings.doctor_name}</h1>
          <p className="text-sand-500">Aquí tienes un resumen de la actividad hoy.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/booking" className="flex items-center gap-2 bg-white border border-sand-300 hover:bg-sand-50 text-sand-700 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm">
            <ExternalLink className="w-4 h-4" />
            Ver Landing Pública
          </Link>
          <Link to="/patients/new" className="flex items-center gap-2 bg-[#C15F3C] hover:bg-[#8C4429] text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-[#C15F3C]/20">
            <Plus className="w-4 h-4" />
            Nuevo Paciente
          </Link>
        </div>
      </div>
```

Después:
```tsx
    <div className="space-y-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-terracotta-700 to-terracotta-900 rounded-3xl px-6 py-8 md:px-10 md:py-10 text-white shadow-lg">
        <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-[0.14]" aria-hidden="true">
          <path d="M0,80 Q100,20 200,80 T400,80" stroke="white" strokeWidth="2" fill="none" />
          <path d="M0,130 Q100,70 200,130 T400,130" stroke="white" strokeWidth="1.5" fill="none" />
          <circle cx="340" cy="40" r="24" stroke="white" strokeWidth="1.5" fill="none" />
          <circle cx="40" cy="160" r="14" stroke="white" strokeWidth="1.5" fill="none" />
        </svg>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold truncate">Bienvenido, {settings.doctor_name}</h1>
            <p className="text-white/80">Aquí tienes un resumen de la actividad hoy.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/booking" className="flex items-center gap-2 bg-white/10 border border-white/30 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-medium transition-all backdrop-blur-sm">
              <ExternalLink className="w-4 h-4" />
              Ver Landing Pública
            </Link>
            <Link to="/patients/new" className="flex items-center gap-2 bg-white hover:bg-sand-50 text-terracotta-800 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg">
              <Plus className="w-4 h-4" />
              Nuevo Paciente
            </Link>
          </div>
        </div>
      </div>
```

Nota: la línea `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">` (línea 100 original, primer stat-card) queda exactamente igual, inmediatamente después de este bloque — no se toca `StatCard` ni el resto del archivo.

- [ ] **Step 2: Verificar visualmente**

Run: `npm run dev`, loguearse y ver el Dashboard.
Expected: el encabezado ahora es un bloque con degradado terracota oscuro de esquinas muy redondeadas, con las líneas decorativas de fondo, texto blanco, y los dos botones de acción (uno translúcido tipo "glass" para Ver Landing, uno blanco sólido con texto terracota para Nuevo Paciente). Debajo, el grid de 4 stat-cards sigue funcionando igual (mismos datos, mismo estilo de card ya existente). Sin errores de consola, datos reales (pacientes/citas) siguen cargando.

- [ ] **Step 3: Commit**

```bash
git add pages/Dashboard.tsx
git commit -m "style: redesign Dashboard header as gradient hero block"
```

---

### Task 3: Revisión final, deploy y aprobación del usuario

- [ ] Dispatch del reviewer final de rama (`superpowers:requesting-code-review`), foco en: coherencia visual de ambos rediseños con el spec (Ampliación Fase 2b), que ningún cambio de lógica se haya colado, contraste de texto blanco sobre el degradado terracota (debe pasar AA — degradado va de terracota-700 a terracota-900, ambos ya verificados con buen contraste en la revisión de Fase 2a).
- [ ] Aplicar fixes de hallazgos Critical/Important si los hay, re-revisar.
- [ ] Deploy a Dokploy y verificación en vivo en navegador: `/login` y Dashboard (autenticado).
- [ ] **No mergear todavía** — mostrarle el resultado a la doctora (deploy en vivo) para que apruebe el estilo antes de decidir si se replica al resto de la app o se ajusta algo más.
