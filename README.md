<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Dermatrichology App your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1CxrJ7qVXS5JxdeI4dzOuKqKR4HqGykyE

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Gestión de usuarios

El primer administrador se crea desde la línea de comandos (bootstrap):

```
npm run create-admin -- admin@clinica.com "una-password-larga" "Nombre Admin"
```

A partir de ahí, los usuarios se administran desde la app en **Usuarios** (`/users`),
visible solo para el rol `admin`: alta con rol (`admin` / `doctor` / `assistant`),
cambio de rol, restablecimiento de contraseña y eliminación.

La API correspondiente (`/api/profiles`) exige rol `admin` para listar, crear,
modificar y eliminar. Un admin no puede cambiarse su propio rol ni borrarse a sí mismo.

## Tests del backend

```
npm test
```

## Permisos por rol (API)

| Endpoint | admin | doctor | assistant |
| --- | :---: | :---: | :---: |
| `GET /api/patients`, `GET /api/patients/:id` | ✅ | ✅ | ✅ |
| `POST/PATCH/DELETE /api/patients` | ✅ | ✅ | ❌ |
| `/api/appointments` (todo) | ✅ | ✅ | ✅ |
| `GET /api/settings` | ✅ | ✅ | ✅ |
| `PUT /api/settings` | ✅ | ❌ | ❌ |
| `/api/profiles` (listar, crear, editar, borrar) | ✅ | ❌ | ❌ |
| Historias, sesiones, labs, tratamientos, recetas | ✅ | ✅ | ❌ |

Los guards viven en cada router (`server/lib/requireRole.js`) y se verifican en
`server/routes/roles.test.js`, así que la restricción ya no depende solo del enrutado
del frontend.
