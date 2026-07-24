import { Client } from 'pg';

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};


const setupAuthTable = async (client) => {
    await client.query(`
        CREATE TABLE IF NOT EXISTS empresas_auth (
            empresa_id VARCHAR(50) PRIMARY KEY,
            password_hash VARCHAR(255) NOT NULL,
            is_authorized BOOLEAN DEFAULT false,
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await client.query(`
        ALTER TABLE empresas_auth
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
    `);
    await client.query(`
        UPDATE empresas_auth
        SET status = CASE
            WHEN empresa_id = 'SUPERUSUARIO' THEN 'approved'
            WHEN is_authorized = true THEN 'approved'
            WHEN status IS NULL OR status = '' THEN 'pending'
            ELSE status
        END
        WHERE status IS NULL OR status = '' OR (empresa_id = 'SUPERUSUARIO' AND status != 'approved');
    `);
    await client.query(`
        UPDATE empresas_auth
        SET is_authorized = CASE WHEN status = 'approved' THEN true ELSE false END
        WHERE status IS NOT NULL;
    `);
    await client.query(`
        INSERT INTO empresas_auth (empresa_id, password_hash, is_authorized, status) 
        VALUES ('SUPERUSUARIO', 'super123', true, 'approved') 
        ON CONFLICT (empresa_id) DO NOTHING;
    `);
};

const setupFinanceTable = async (client) => {
    await client.query(`
        CREATE TABLE IF NOT EXISTS registros_financieros (
            id SERIAL PRIMARY KEY,
            empresa_id VARCHAR(100) NOT NULL,
            clave_empresa VARCHAR(100) NOT NULL,
            anio INTEGER NOT NULL,
            mes INTEGER NOT NULL,
            ventas_netas NUMERIC(15,2),
            costo_ventas NUMERIC(15,2),
            gastos_administracion NUMERIC(15,2),
            depreciacion NUMERIC(15,2),
            ingresos_financieros NUMERIC(15,2),
            gastos_financieros NUMERIC(15,2),
            impuesto_renta NUMERIC(15,2),
            impuesto_provision NUMERIC(15,2),
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (empresa_id, anio, mes)
        );
    `);
    await client.query(`
        ALTER TABLE registros_financieros
        ADD COLUMN IF NOT EXISTS impuesto_provision NUMERIC(15,2);
    `);
    await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS registros_financieros_empresa_anio_mes_idx ON registros_financieros (empresa_id, anio, mes);
    `);
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

        const url = new URL(request.url);

    // Route: /api/verify-turnstile
    if (url.pathname === '/api/verify-turnstile' || url.pathname.endsWith('/verify-turnstile')) {
      if (request.method !== 'POST') return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
      if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
      try {
        const data = await request.json();
        const token = data.token;
        const secret = env.TURNSTILE_SECRET || "1x0000000000000000000000000000000AA";

        const formData = new FormData();
        formData.append('secret', secret);
        formData.append('response', token);
        formData.append('remoteip', request.headers.get('CF-Connecting-IP') || '');

        const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData
        });
        const cfData = await cfRes.json();

        return new Response(JSON.stringify(cfData), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
    }

        // Route: /api/borrar-financiero
    if (url.pathname === '/api/borrar-financiero' || url.pathname.endsWith('/borrar-financiero')) {
      if (request.method !== 'POST') return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
      try {
        const connectionString = env.hyperdrive?.connectionString || env.DATABASE_URL;
        if (!connectionString) throw new Error("Falta el tunel HYPERDRIVE o DATABASE_URL");
        const client = new Client({ connectionString });
        const data = await request.json();
        await client.connect();
        const query = `DELETE FROM registros_financieros WHERE empresa_id = $1 AND anio = $2 AND mes = $3`;
        const values = [data.empresa_id, data.anio, data.mes];
        const resDB = await client.query(query, values);
        await client.end();
        return new Response(JSON.stringify({ success: true, deleted: resDB.rowCount }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
    }
    // Route: /api/guardar-financiero
    if (url.pathname === '/api/guardar-financiero' || url.pathname.endsWith('/guardar-financiero')) {
      if (request.method !== 'POST') return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });

      try {
        const connectionString = env.hyperdrive?.connectionString || env.DATABASE_URL;
        if (!connectionString) throw new Error("Falta el túnel HYPERDRIVE o DATABASE_URL");
        const client = new Client({
          connectionString
        });
        const data = await request.json();
        await client.connect();
        await setupFinanceTable(client);

        const query = `
          INSERT INTO registros_financieros 
          (empresa_id, clave_empresa, anio, mes, ventas_netas, costo_ventas, gastos_administracion, depreciacion, ingresos_financieros, gastos_financieros, impuesto_renta, impuesto_provision)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (empresa_id, anio, mes)
          DO UPDATE SET 
            ventas_netas = EXCLUDED.ventas_netas,
            costo_ventas = EXCLUDED.costo_ventas,
            gastos_administracion = EXCLUDED.gastos_administracion,
            depreciacion = EXCLUDED.depreciacion,
            ingresos_financieros = EXCLUDED.ingresos_financieros,
            gastos_financieros = EXCLUDED.gastos_financieros,
            impuesto_renta = EXCLUDED.impuesto_renta,
            impuesto_provision = EXCLUDED.impuesto_provision
          RETURNING id;
        `;
        const values = [
          data.empresa_id, data.clave_empresa, data.anio, data.mes,
          data.ventas_netas, data.costo_ventas, data.gastos_administracion,
          data.depreciacion, data.ingresos_financieros, data.gastos_financieros,
          data.impuesto_renta, data.impuesto_provision
        ];

        const res = await client.query(query, values);

        // Use ctx.waitUntil to close client after returning response
        ctx.waitUntil(client.end());

        return new Response(JSON.stringify({ message: "Éxito", id: res.rows[0].id }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });

      } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: err.message, details: "Cloudflare Worker Error", env_hyperdrive_exists: !!env.hyperdrive }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
    }

    // Route: /api/obtener-financiero
    if (url.pathname === '/api/obtener-financiero' || url.pathname.endsWith('/obtener-financiero')) {
      if (request.method !== 'GET') return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });

      const empresa_id = url.searchParams.get('empresa_id');
      const anio = url.searchParams.get('anio');

      if (!empresa_id || !anio) {
        return new Response(JSON.stringify({ error: "Faltan parámetros empresa_id o anio" }), {
          status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      try {
        const connectionString = env.hyperdrive?.connectionString || env.DATABASE_URL;
        if (!connectionString) throw new Error("Falta el túnel HYPERDRIVE o DATABASE_URL");
        const client = new Client({
          connectionString
        });
        await client.connect();

        const query = `
          SELECT * FROM registros_financieros 
          WHERE empresa_id = $1 AND anio = $2
          ORDER BY mes ASC;
        `;
        const res = await client.query(query, [empresa_id, parseInt(anio)]);
        ctx.waitUntil(client.end());

        return new Response(JSON.stringify(res.rows), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: err.message, details: "Cloudflare Worker Error", env_hyperdrive_exists: !!env.hyperdrive }), {
          status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
    }

    
    if (url.pathname === '/api/login' || url.pathname.endsWith('/login')) {
      if (request.method !== 'POST') return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
      try {
        const connectionString = env.hyperdrive?.connectionString || env.DATABASE_URL;
        if (!connectionString) throw new Error("Falta el túnel HYPERDRIVE o DATABASE_URL");

        const data = await request.json();

        // --- Verificación de Cloudflare Turnstile ---
        const turnstileToken = data.turnstile_token;
        if (!turnstileToken) {
          return new Response(JSON.stringify({ success: false, error: "Por favor, completa el captcha de seguridad." }), {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          });
        }

        const turnstileSecret = env.TURNSTILE_SECRET || "1x0000000000000000000000000000000AA";
        const formData = new FormData();
        formData.append('secret', turnstileSecret);
        formData.append('response', turnstileToken);
        formData.append('remoteip', request.headers.get('CF-Connecting-IP') || '');

        const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: formData
        });
        const cfData = await cfRes.json();

        if (!cfData.success) {
          return new Response(JSON.stringify({ success: false, error: "Falló la verificación de seguridad. Por favor, inténtalo de nuevo." }), {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          });
        }

        const client = new Client({ connectionString });
        await client.connect();
        await setupAuthTable(client);

        const res = await client.query("SELECT * FROM empresas_auth WHERE empresa_id = $1", [data.empresa_id]);
        let user = res.rows[0];

        if (!user) {
            // Auto-approve DEMO accounts for quick access
            const isDemo = data.empresa_id === 'DEMO';
            const newStatus = isDemo ? 'approved' : 'pending';
            const newAuth = isDemo ? true : false;
            await client.query(
              "INSERT INTO empresas_auth (empresa_id, password_hash, is_authorized, status) VALUES ($1, $2, $3, $4)",
              [data.empresa_id, data.password, newAuth, newStatus]
            );
            ctx.waitUntil(client.end());
            if (isDemo) {
              return new Response(JSON.stringify({ success: true, user: { id: data.empresa_id } }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
            }
            return new Response(JSON.stringify({ success: false, error: "Tu cuenta ha sido registrada y está pendiente de autorización por el administrador." }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
        } else {
            const userStatus = user.status || (user.is_authorized ? 'approved' : 'pending');
            if (user.password_hash !== data.password) {
                ctx.waitUntil(client.end());
                return new Response(JSON.stringify({ success: false, error: "Contraseña incorrecta." }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
            }
            if (userStatus === 'rejected') {
                ctx.waitUntil(client.end());
                return new Response(JSON.stringify({ success: false, error: "Tu cuenta ha sido rechazada por el administrador." }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
            }
            if (userStatus !== 'approved' && user.empresa_id !== 'SUPERUSUARIO') {
                ctx.waitUntil(client.end());
                return new Response(JSON.stringify({ success: false, error: "Tu cuenta está pendiente de autorización por el administrador." }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
            }
            ctx.waitUntil(client.end());
            return new Response(JSON.stringify({ success: true, user: { id: user.empresa_id } }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
        }
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
      }
    }

    if (url.pathname === '/api/get-empresas' || url.pathname.endsWith('/get-empresas')) {
        try {
            const connectionString = env.hyperdrive?.connectionString || env.DATABASE_URL;
            const client = new Client({ connectionString });
            await client.connect();
            await setupAuthTable(client);
            const res = await client.query("SELECT empresa_id, password_hash, is_authorized, status, created_at FROM empresas_auth WHERE empresa_id != 'SUPERUSUARIO' AND COALESCE(status, 'pending') != 'rejected' ORDER BY created_at DESC");
            ctx.waitUntil(client.end());
            return new Response(JSON.stringify(res.rows), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
        } catch(err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
        }
    }

    if (url.pathname === '/api/approve-empresa' || url.pathname.endsWith('/approve-empresa')) {
        try {
            const data = await request.json();
            const connectionString = env.hyperdrive?.connectionString || env.DATABASE_URL;
            const client = new Client({ connectionString });
            await client.connect();
            await setupAuthTable(client);
            const newStatus = data.is_authorized ? 'approved' : 'pending';
            await client.query("UPDATE empresas_auth SET is_authorized = $1, status = $2 WHERE empresa_id = $3", [data.is_authorized, newStatus, data.empresa_id]);
            ctx.waitUntil(client.end());
            return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
        } catch(err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
        }
    }

    
    if (url.pathname === '/api/update-password' || url.pathname.endsWith('/update-password')) {
        if (request.method !== 'POST') return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
        try {
            const data = await request.json();
            const connectionString = env.hyperdrive?.connectionString || env.DATABASE_URL;
            const client = new Client({ connectionString });
            await client.connect();
            await setupAuthTable(client);
            const res = await client.query("UPDATE empresas_auth SET password_hash = $1 WHERE empresa_id = $2", [data.password, data.empresa_id]);
            ctx.waitUntil(client.end());
            if (res.rowCount === 0) {
                return new Response(JSON.stringify({ success: false, error: 'No se encontró la empresa.' }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
            }
            return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
        } catch(err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
        }
    }

    if (url.pathname === '/api/delete-empresa' || url.pathname.endsWith('/delete-empresa')) {
        try {
            const data = await request.json();
            const connectionString = env.hyperdrive?.connectionString || env.DATABASE_URL;
            const client = new Client({ connectionString });
            await client.connect();
            await setupAuthTable(client);
            await client.query("DELETE FROM empresas_auth WHERE empresa_id = $1", [data.empresa_id]);
            ctx.waitUntil(client.end());
            return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
        } catch(err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
        }
    }
    // If no route matches, return 404
    return env.ASSETS.fetch(request);
  }
};




