const fs = require('fs');
let code = fs.readFileSync('public/app.js', 'utf8');

const newLoginLogic = `
        const user = await loginUser(id, pwd);
        currentCompany = user.id;
        document.getElementById('current-company').textContent = \`🏦 \${currentCompany}\`;

        switchView('dashboard-view');
        
        if (currentCompany === 'SUPERUSUARIO') {
            switchSection('admin-view');
            loadAdminData();
        } else {
            switchSection('dashboard-home');
        }
`;

// Replace the old login success block
code = code.replace(/const user = await loginUser\(id, pwd\);\s+currentCompany = user\.id;\s+document\.getElementById\('current-company'\)\.textContent = [^;]+;\s+switchView\('dashboard-view'\);\s+switchSection\('dashboard-home'\);/, newLoginLogic);

const adminFunctions = `
// --- Admin Logic ---
const loadAdminData = async () => {
    try {
        const response = await fetch('/api/get-empresas');
        if (!response.ok) throw new Error('Error al obtener empresas');
        const data = await response.json();
        
        const tbody = document.getElementById('admin-empresas-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        data.forEach(emp => {
            const tr = document.createElement('tr');
            
            const tdId = document.createElement('td');
            tdId.textContent = emp.empresa_id;
            
            const tdStatus = document.createElement('td');
            tdStatus.textContent = emp.is_authorized ? '✅ Autorizado' : '⏳ Pendiente';
            
            const tdAction = document.createElement('td');
            if (!emp.is_authorized) {
                const btn = document.createElement('button');
                btn.className = 'btn-primary';
                btn.style.padding = '0.5rem 1rem';
                btn.style.fontSize = '0.8rem';
                btn.textContent = 'Aprobar';
                btn.onclick = () => approveEmpresa(emp.empresa_id);
                tdAction.appendChild(btn);
            } else {
                const btn = document.createElement('button');
                btn.className = 'btn-secondary';
                btn.style.padding = '0.5rem 1rem';
                btn.style.fontSize = '0.8rem';
                btn.textContent = 'Revocar';
                btn.onclick = () => revokeEmpresa(emp.empresa_id);
                tdAction.appendChild(btn);
            }
            
            tr.appendChild(tdId);
            tr.appendChild(tdStatus);
            tr.appendChild(tdAction);
            tbody.appendChild(tr);
        });
    } catch(err) {
        showToast(err.message, 'error');
    }
};

const approveEmpresa = async (empresa_id) => {
    try {
        const response = await fetch('/api/approve-empresa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empresa_id, is_authorized: true })
        });
        if (!response.ok) throw new Error('Error al aprobar');
        showToast(\`\${empresa_id} ha sido autorizado\`);
        loadAdminData();
    } catch(err) {
        showToast(err.message, 'error');
    }
};

const revokeEmpresa = async (empresa_id) => {
    try {
        const response = await fetch('/api/approve-empresa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empresa_id, is_authorized: false })
        });
        if (!response.ok) throw new Error('Error al revocar');
        showToast(\`Se ha revocado el acceso a \${empresa_id}\`);
        loadAdminData();
    } catch(err) {
        showToast(err.message, 'error');
    }
};
`;

if (!code.includes('const loadAdminData')) {
    code += '\n' + adminFunctions;
    fs.writeFileSync('public/app.js', code);
    console.log("Patched app.js with admin logic");
} else {
    console.log("Admin logic already in app.js");
}
