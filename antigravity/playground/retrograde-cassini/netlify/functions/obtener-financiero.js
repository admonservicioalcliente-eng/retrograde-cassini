const { Client } = require('pg');

exports.handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Método no permitido" };
  }

  const { empresa_id, anio } = event.queryStringParameters;

  if (!empresa_id || !anio) {
    return { statusCode: 400, body: JSON.stringify({ error: "Faltan parámetros empresa_id o anio" }) };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
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
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(res.rows),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message, details: "Error en obtener-financiero" }),
    };
  } finally {
    await client.end();
  }
};
