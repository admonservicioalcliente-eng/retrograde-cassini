process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://avnadmin:AVNS_LLpgxsYIuGlTxU-WuL-@pg-control1965-admonservicioalcliente-1965.b.aivencloud.com:24731/defaultdb?sslmode=require'
  rejectUnauthorized: false
});

async function main() {
  await client.connect();
  console.log('✅ Conectado a defaultdb!');

  // Ver tablas existentes
  const tablas = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
  );
  console.log('📋 Tablas en defaultdb:', tablas.rows);

  // Crear tabla si no existe
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
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Tabla registros_financieros creada/verificada!');

  await client.end();
}

main().catch(e => {
  console.error('❌ ERROR:', e.message);
  process.exit(1);
});
