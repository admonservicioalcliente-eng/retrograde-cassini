const { Client } = require('pg');

exports.handler = async (event, context) => {
  // Solo permitir peticiones POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método no permitido" };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Requerido para Aiven
  });

  try {
    const data = JSON.parse(event.body);
    await client.connect();

    // Query para insertar los campos que definiste
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
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Éxito", id: res.rows[0].id }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error al guardar en la base de datos" }),
    };
  } finally {
    await client.end();
  }
};
