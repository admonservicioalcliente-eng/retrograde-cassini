import { Client } from 'pg';

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const empresa_id = url.searchParams.get('empresa_id');
  const anio = url.searchParams.get('anio');

  if (!empresa_id || !anio) {
    return new Response(JSON.stringify({ error: "Faltan parámetros empresa_id o anio" }), {
      status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }

  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const query = `
      SELECT * FROM registros_financieros 
      WHERE empresa_id = $1 AND anio = $2
      ORDER BY mes ASC;
    `;
    const res = await client.query(query, [empresa_id, parseInt(anio)]);
    await client.end();

    return new Response(JSON.stringify(res.rows), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message, details: "Cloudflare Function Error" }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
}
