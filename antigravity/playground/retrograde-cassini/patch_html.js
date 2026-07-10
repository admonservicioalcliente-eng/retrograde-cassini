const fs = require('fs');
let code = fs.readFileSync('public/index.html', 'utf8');

const adminSection = `
        <!-- Admin View -->
        <section id="admin-view" class="view">
            <header>
                <h2>Panel de Administración (SUPERUSUARIO)</h2>
            </header>
            <div style="background: var(--bg-card); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color); overflow-x: auto;">
                <h3>Cuentas Pendientes de Aprobación</h3>
                <table class="data-table" style="margin-top: 1rem;">
                    <thead>
                        <tr>
                            <th>Empresa ID</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="admin-empresas-tbody">
                        <tr><td colspan="3" style="text-align: center;">Cargando...</td></tr>
                    </tbody>
                </table>
            </div>
        </section>
`;

if (!code.includes('id="admin-view"')) {
    code = code.replace('</main>', adminSection + '\n    </main>');
    fs.writeFileSync('public/index.html', code);
    console.log("Injected admin-view into index.html");
} else {
    console.log("admin-view already exists");
}
