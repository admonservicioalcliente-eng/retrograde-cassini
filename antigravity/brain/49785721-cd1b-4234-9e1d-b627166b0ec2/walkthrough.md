# Configuración de Cloudflare Turnstile (Anti-Robot)

He completado la programación e inyección del widget Turnstile de Cloudflare en tu aplicación `FINAPP pro`. Actualmente está funcionando con las "Testing Keys" (Llaves de prueba) de Cloudflare para que la aplicación no se rompa mientras configuras las tuyas.

Para pasar de modo prueba a **modo seguro real**, debes seguir estos pasos exactos:

## Paso 1: Generar tus llaves en Cloudflare
1. Inicia sesión en tu panel de [Cloudflare](https://dash.cloudflare.com/).
2. En el menú de la izquierda, busca y haz clic en **"Turnstile"**.
3. Haz clic en el botón azul **"Add site"** o **"Add widget"** (Agregar sitio).
4. Llena el formulario:
   - **Site name:** `Finapp Pro` (o el nombre que quieras).
   - **Domain:** Escribe el dominio de tu worker: `retrograde-cassini.admonservicioalcliente.workers.dev`.
   - **Widget Mode:** Te sugiero elegir **"Managed"** (Recomendado).
5. Dale a crear. Te mostrará dos llaves muy importantes:
   - La **Site Key** (Llave del sitio) - *Es pública y va en el HTML.*
   - La **Secret Key** (Llave secreta) - *Es privada y va en el servidor.*
   
¡Copia ambas llaves y guárdalas un momento en un bloc de notas!

## Paso 2: Reemplazar la Site Key en tu Frontend (HTML)
Esta llave le dice al widget visual a qué cuenta conectarse.
1. En el código de tu proyecto, abre el archivo `public/index.html`.
2. Busca la línea que contiene el botón de "Ingresar" (alrededor de la línea 40). Justo encima verás este bloque de código:
   ```html
   <!-- NOTA: Reemplazar el data-sitekey con tu Site Key de Cloudflare Turnstile -->
   <div class="cf-turnstile" data-sitekey="1x00000000000000000000AA" style="margin-bottom: 15px; display: flex; justify-content: center;"></div>
   ```
3. Borra el valor `1x00000000000000000000AA` y pega ahí tu **Site Key real**.
4. Guarda el archivo.

## Paso 3: Reemplazar la Secret Key en tu Backend (Worker)
Esta llave es la que usa tu servidor para preguntarle a Cloudflare si el usuario resolvió el captcha correctamente. Se debe configurar como una Variable de Entorno Segura en Cloudflare.

**Desde la consola de Cloudflare (Recomendado y más seguro):**
1. En el panel de Cloudflare, ve a **Workers & Pages**.
2. Selecciona tu worker: `retrograde-cassini`.
3. Ve a la pestaña **Settings** (Configuración) y luego al menú lateral **Variables and Secrets**.
4. En la sección **Variables**, haz clic en "Add".
5. En "Variable name" escribe exactamente: `TURNSTILE_SECRET`
6. En "Value" pega tu **Secret Key real**.
7. Selecciona el botón **"Encrypt"** (Encriptar) para ocultar el valor por seguridad, y dale a **Save**.

## Paso 4: Desplegar los cambios
Una vez que hayas cambiado el `index.html`, necesitas subir esa pequeña actualización a Cloudflare.
Simplemente vuelve a correr este comando en tu terminal de Windows:

```bash
npx wrangler deploy
```

¡Eso es todo! Con eso el widget de seguridad estará protegiendo activamente tu inicio de sesión contra cualquier bot o ataque automatizado.
