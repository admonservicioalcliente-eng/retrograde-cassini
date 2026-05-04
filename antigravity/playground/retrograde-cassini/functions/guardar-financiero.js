import { Client } from 'pg';

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
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
    await client.end();

    return new Response(JSON.stringify({ message: "Éxito", id: res.rows[0].id }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message, details: "Cloudflare Function Error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
}
