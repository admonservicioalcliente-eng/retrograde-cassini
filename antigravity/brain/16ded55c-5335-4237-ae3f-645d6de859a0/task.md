# Tareas para Autorización de Usuarios

- `[x]` Crear tabla `empresas_auth` en Postgres (Aiven).
- `[x]` Modificar `src/index.js` (Worker) para agregar endpoints:
  - `[x]` POST `/api/login` (registro/login y validación de estado).
  - `[x]` GET `/api/get-empresas` (solo SUPERUSUARIO: ver empresas pendientes).
  - `[x]` POST `/api/approve-empresa` (solo SUPERUSUARIO: aprobar empresa).
- `[x]` Modificar `public/db.js` y `public/app.js` (Frontend):
  - `[x]` Cambiar lógica de `loginUser` para apuntar a `/api/login`.
  - `[x]` Mostrar alertas de "cuenta en espera de aprobación".
- `[x]` Modificar `public/index.html` (UI):
  - `[x]` Crear la vista de Administrador (`admin-view`).
  - `[x]` Diseñar tabla y botón de aprobar.
- `[x]` Desplegar cambios a Cloudflare.
- `[ ]` Verificar flujo de aprobación manual con SUPERUSUARIO.
