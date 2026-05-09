import { Client } from 'pg';

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Route: /api/guardar-financiero
    if (url.pathname === '/api/guardar-financiero' || url.pathname.endsWith('/guardar-financiero')) {
      if (request.method !== 'POST') return new Response("Method Not Allowed", { status: 405 });
      
      try {
        if (!env.DATABASE_URL) throw new Error("Falta la variable de entorno DATABASE_URL");
        const client = new Client({
          connectionString: env.DATABASE_URL
        });
        const data = await request.json();
        await client.connect();

        const query = `
          INSERT INTO registros_financieros 
          (empresa_id, clave_empresa, anio, mes, ventas_netas, costo_ventas, gastos_administracion, depreciacion, ingresos_financieros, gastos_financieros, impuesto_renta)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id;
        `;
        const values = [
          data.empresa_id, data.clave_empresa, data.anio, data.mes, 
          data.ventas_netas, data.costo_ventas, data.gastos_administracion, 
          data.depreciacion, data.ingresos_financieros, data.gastos_financieros, 
          data.impuesto_renta
        ];

        const res = await client.query(query, values);
        
        // Use ctx.waitUntil to close client after returning response
        ctx.waitUntil(client.end());

        return new Response(JSON.stringify({ message: "Éxito", id: res.rows[0].id }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });

      } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: err.message, details: "Cloudflare Worker Error" }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
    }

    // Route: /api/obtener-financiero
    if (url.pathname === '/api/obtener-financiero' || url.pathname.endsWith('/obtener-financiero')) {
      if (request.method !== 'GET') return new Response("Method Not Allowed", { status: 405 });

      const empresa_id = url.searchParams.get('empresa_id');
      const anio = url.searchParams.get('anio');

      if (!empresa_id || !anio) {
        return new Response(JSON.stringify({ error: "Faltan parámetros empresa_id o anio" }), {
          status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      try {
        if (!env.DATABASE_URL) throw new Error("Falta la variable de entorno DATABASE_URL");
        const client = new Client({
          connectionString: env.DATABASE_URL
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
        return new Response(JSON.stringify({ error: err.message, details: "Cloudflare Worker Error" }), {
          status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
    }

    // If no route matches, return 404
    return new Response("Not found", { status: 404, headers: CORS_HEADERS });
  }
};
