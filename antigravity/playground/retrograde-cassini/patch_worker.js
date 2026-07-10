const fs = require('fs');
let code = fs.readFileSync('src/index.js', 'utf8');

const setupFunc = `
const setupAuthTable = async (client) => {
    await client.query(\`
        CREATE TABLE IF NOT EXISTS empresas_auth (
            empresa_id VARCHAR(50) PRIMARY KEY,
            password_hash VARCHAR(255) NOT NULL,
            is_authorized BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    \`);
    await client.query(\`
        INSERT INTO empresas_auth (empresa_id, password_hash, is_authorized) 
        VALUES ('SUPERUSUARIO', 'super123', true) 
        ON CONFLICT DO NOTHING;
    \`);
};
`;

const newRoutes = `
    if (url.pathname === '/api/login' || url.pathname.endsWith('/login')) {
      if (request.method !== 'POST') return new Response("Method Not Allowed", { status: 405 });
      try {
        const connectionString = env.hyperdrive?.connectionString || env.DATABASE_URL;
        const client = new Client({ connectionString });
        const data = await request.json();
        await client.connect();
        await setupAuthTable(client);

        const res = await client.query("SELECT * FROM empresas_auth WHERE empresa_id = $1", [data.empresa_id]);
        let user = res.rows[0];

        if (!user) {
            await client.query(
              "INSERT INTO empresas_auth (empresa_id, password_hash, is_authorized) VALUES ($1, $2, false)",
              [data.empresa_id, data.password]
            );
            ctx.waitUntil(client.end());
            return new Response(JSON.stringify({ success: false, error: "Tu cuenta ha sido registrada y está pendiente de autorización por el administrador." }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
        } else {
            if (user.password_hash !== data.password) {
                ctx.waitUntil(client.end());
                return new Response(JSON.stringify({ success: false, error: "Contraseña incorrecta." }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
            }
            if (!user.is_authorized && user.empresa_id !== 'SUPERUSUARIO') {
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
            const res = await client.query("SELECT empresa_id, is_authorized, created_at FROM empresas_auth WHERE empresa_id != 'SUPERUSUARIO' ORDER BY created_at DESC");
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
            await client.query("UPDATE empresas_auth SET is_authorized = $1 WHERE empresa_id = $2", [data.is_authorized, data.empresa_id]);
            ctx.waitUntil(client.end());
            return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
        } catch(err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
        }
    }
`;

code = code.replace("export default {", setupFunc + "\nexport default {");
code = code.replace("// If no route matches", newRoutes + "\n    // If no route matches");

fs.writeFileSync('src/index.js', code);
