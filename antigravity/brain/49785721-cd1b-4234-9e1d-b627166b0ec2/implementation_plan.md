# Despliegue en Cloudflare con Base de Datos Aiven

El objetivo es solucionar el error de publicación en Cloudflare y configurar correctamente el proyecto para que sirva tanto la página web (frontend) como la API (backend) conectada a la base de datos de Aiven PostgreSQL mediante Hyperdrive.

## Problema Actual
El error `Could not detect a directory containing static files` ocurre porque el archivo `package.json` contiene dependencias de Next.js (`next`, `react`). Esto confunde a la herramienta de despliegue de Cloudflare (`wrangler`), haciéndole creer que es un proyecto de Next.js e intentando buscar la carpeta de salida estática de Next.js en lugar de usar tus archivos vanilla en la carpeta `public`. 

Además, necesitamos que el código backend (que se conecta a Aiven) y el frontend vivan bajo el mismo dominio para evitar problemas de conexión y simplificar la publicación.

## Cambios Propuestos

### 1. Limpieza de `package.json`
- Eliminaremos las referencias a `next`, `react` y `react-dom` ya que el proyecto utiliza HTML, CSS y JS puro en la carpeta `public`. Esto evitará que Cloudflare se confunda al publicar.

### 2. Configurar "Workers Static Assets" en `wrangler.toml`
- Cloudflare introdujo recientemente una forma moderna de servir archivos estáticos directamente desde un Worker. Añadiremos la siguiente configuración al archivo `wrangler.toml`:
  ```toml
  [assets]
  directory = "public"
  binding = "ASSETS"
  ```
  Esto le dirá a Cloudflare que suba todos los archivos de la carpeta `public` (tu HTML, CSS y JS).

### 3. Actualizar el Backend (`src/index.js`)
- Actualizaremos el archivo `src/index.js` para que sirva los archivos estáticos si la ruta solicitada no es de la API.
  Agregaremos esta línea al final del archivo para que los archivos estáticos carguen correctamente:
  ```javascript
  return env.ASSETS.fetch(request);
  ```

## Plan de Verificación
1. Ejecutar el comando de publicación `npx wrangler deploy`.
2. Verificar que Cloudflare publica exitosamente la aplicación.
3. Ingresar a la URL que nos dé Cloudflare y probar guardar un registro para confirmar que se está guardando en la base de datos de Aiven en la nube.

> [!NOTE]
> Con este plan conservarás la base de datos de AIVEN que ya está configurada a través del túnel seguro de Hyperdrive, pero corregiremos la arquitectura para que tu frontend y backend funcionen perfectamente en producción.
