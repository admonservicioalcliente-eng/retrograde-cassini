# Plan de Implementación: Autorización de Usuarios (Admin)

Actualmente, la aplicación gestiona los inicios de sesión de manera local en el navegador (usando IndexedDB). Para cumplir con tu solicitud de que las cuentas deban ser autorizadas por un Administrador (SUPERUSUARIO), necesitamos migrar la autenticación a la base de datos en la nube (Aiven Postgres) y construir un flujo de aprobación.

## Open Questions

> [!WARNING]  
> ¿Deseas que la interfaz para aprobar usuarios esté dentro de la misma aplicación web (entrando con el ID "SUPERUSUARIO") o prefieres aprobarlos manualmente ejecutando un comando en la base de datos (pgAdmin)? 
> Te recomiendo construir una pequeña tabla en la misma app web donde, al iniciar sesión como "SUPERUSUARIO", puedas ver las empresas que se han registrado y presionar un botón de "Aprobar".

## Proposed Changes

### Componente: Base de Datos (Aiven Postgres)
#### [NEW] Nueva tabla: `empresas_auth`
- Se creará una tabla en Aiven con las columnas: `empresa_id` (texto), `password_hash` (texto cifrado), `is_authorized` (booleano, por defecto `false`), `email` (texto, opcional).

### Componente: Backend (Cloudflare Worker `src/index.js`)
#### [MODIFY] [src/index.js](file:///C:/Users/SUPERUSUARIO/.gemini/antigravity/playground/retrograde-cassini/src/index.js)
- **Nuevo Endpoint `/api/login`:** Validará las credenciales contra Postgres. Si las credenciales son válidas pero `is_authorized` es falso, devolverá un error: "Cuenta pendiente de autorización". Si no existe, registrará la cuenta como pendiente.
- **Nuevo Endpoint `/api/approve`:** Permitirá al SUPERUSUARIO cambiar el estado de `is_authorized` a verdadero.
- **Modificación en `/api/guardar-financiero`:** Se añadirá una validación extra para asegurarse de que quien guarda datos realmente está autorizado en la base de datos.

### Componente: Frontend (Cliente Web)
#### [MODIFY] [public/db.js](file:///C:/Users/SUPERUSUARIO/.gemini/antigravity/playground/retrograde-cassini/public/db.js)
- Eliminar la lógica de "Auto-registro" en IndexedDB. Ahora `loginUser` llamará mediante la red a `/api/login`.
#### [MODIFY] [public/app.js](file:///C:/Users/SUPERUSUARIO/.gemini/antigravity/playground/retrograde-cassini/public/app.js)
- Mostrar un mensaje de alerta ("Tu cuenta está a la espera de ser autorizada por el administrador") si la API rechaza el acceso por falta de permisos.
#### [MODIFY] [public/index.html](file:///C:/Users/SUPERUSUARIO/.gemini/antigravity/playground/retrograde-cassini/public/index.html)
- Añadir una vista oculta llamada `admin-view` que solo se mostrará si la cuenta logueada es el SUPERUSUARIO. Aquí se verán las empresas que han intentado ingresar y un botón para aprobarlas.

## Verification Plan

### Manual Verification
1. Ingresaré con un usuario nuevo ("NUEVO_CLIENTE"). El sistema me mostrará que estoy pendiente de aprobación.
2. Ingresaré con "SUPERUSUARIO". Veré a "NUEVO_CLIENTE" en una lista y lo aprobaré.
3. Volveré a entrar como "NUEVO_CLIENTE" y el sistema me dejará acceder al Dashboard.
