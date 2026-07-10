# Plan de Implementación de Cloudflare Turnstile (Verificación Anti-Robot)

Este documento describe cómo integraremos la verificación "Soy humano" (Cloudflare Turnstile) en el inicio de sesión de tu aplicación para añadir seguridad contra accesos automatizados, cumpliendo con tu solicitud de realizar un respaldo previo del archivo `index.html`.

## Pasos de Implementación

### 1. Respaldo de Seguridad
- Se creará una copia de seguridad `index.html.backup` del archivo principal antes de realizar cualquier modificación.

### 2. Frontend (`public/index.html`)
- Se añadirá el script oficial de Cloudflare Turnstile en el `<head>` del documento: `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`.
- Se insertará el widget o cajita interactiva de verificación dentro del formulario de inicio de sesión (`#login-form`), justo encima del botón de "Ingresar".
- Utilizaremos inicialmente la **Testing Site Key** pública de Cloudflare (`1x00000000000000000000AA`) para poder programar y probar sin que genere errores.

### 3. Lógica del Cliente (`public/app.js`)
- Se modificará el evento de envío del formulario de inicio de sesión.
- Antes de verificar la contraseña local, se interceptará el código (token) secreto generado por Turnstile.
- Se enviará este token al servidor (Worker de Cloudflare) para que valide criptográficamente si eres humano.
- Si la verificación falla o no completaste el desafío, se detendrá el inicio de sesión con un mensaje de error.

### 4. Backend (`src/index.js`)
- Se creará una nueva ruta segura: `/api/verify-turnstile`.
- Esta ruta recibirá el token desde el navegador y hará una petición a los servidores centrales de Cloudflare (`https://challenges.cloudflare.com/turnstile/v0/siteverify`).
- Se validará el token usando una **Testing Secret Key**.
- Si el resultado es exitoso (`success: true`), se le dará permiso al Frontend para continuar con el login habitual.

> [!IMPORTANT]
> **Requisito para Producción:** Yo dejaré todo el código programado y conectado utilizando las llaves de prueba de Cloudflare (que siempre simulan un paso exitoso para los desarrolladores). Una vez que termine y lo probemos, tú **deberás generar tu Site Key y Secret Key reales** desde tu panel de control de Cloudflare Turnstile y reemplazar las llaves de prueba en el código HTML y en las variables de entorno de tu Worker.

## Plan de Pruebas
1. Intentar iniciar sesión sin llenar el captcha (debería bloquear el acceso).
2. Intentar iniciar sesión llenando el captcha con éxito (el sistema debe permitir el login).

**¿Estás de acuerdo con este enfoque? Si es así, aprueba este plan para que empiece a programarlo.**
