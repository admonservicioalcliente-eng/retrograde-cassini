# Walkthrough: Sistema de Autorización y Admin

He finalizado la implementación de la nueva arquitectura de seguridad para FINAPPZAS. Aquí están los detalles de los cambios.

## 1. Migración al Backend (Aiven Postgres)
Anteriormente, el inicio de sesión ocurría dentro del navegador de cada cliente (IndexedDB). Ahora se ha creado la tabla `empresas_auth` en la base de datos oficial.
*   **Seguridad Mejorada:** Todo nuevo usuario que intenta iniciar sesión, queda registrado en la base de datos en la nube con un estado de **No Autorizado** (`is_authorized = false`).
*   A estos usuarios se les muestra el mensaje: *"Tu cuenta ha sido registrada y está pendiente de autorización por el administrador."* y no se les permite ver los tableros financieros.

## 2. El Panel del SUPERUSUARIO
He creado una cuenta administrativa que se auto-genera en el sistema.
*   **Usuario (ID):** `SUPERUSUARIO`
*   **Contraseña:** `super123` *(puedes cambiar esta contraseña más adelante o te enseño cómo hacerlo si lo deseas).*

Cuando inicies sesión con ese ID exactamente, la aplicación detectará que eres el dueño del software y **no** te mostrará los gráficos financieros, sino que te redirigirá a tu nuevo **Panel de Administración**.

## 3. Flujo de Aprobación
Dentro de ese panel de administración verás:
*   Una tabla que lista todas las empresas (clientes) que han intentado entrar a tu aplicación.
*   Un botón verde de **Aprobar** junto a los usuarios que están bloqueados. Al presionarlo, el sistema le da permisos reales en la base de datos de inmediato.
*   Un botón gris de **Revocar** por si en algún momento deseas cortarle el acceso a un cliente (por ejemplo, si dejan de pagar la mensualidad del software).

## Verificación

1. Ingresa a la app con un ID inventado (ej: `CLIENTE_NUEVO`) y contraseña `1234`. La app te mostrará un error rojo diciendo que estás pendiente de aprobación.
2. Sal e ingresa como `SUPERUSUARIO` y clave `super123`.
3. Verás la lista. Dale clic a "Aprobar" al lado de `CLIENTE_NUEVO`.
4. Vuelve a iniciar sesión como `CLIENTE_NUEVO`. ¡Ahora sí te dejará ver el panel financiero!
