const fs = require('fs');
let code = fs.readFileSync('public/db.js', 'utf8');

const oldLogin = `const loginUser = async (companyId, password) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['companies'], 'readwrite');
        const store = transaction.objectStore('companies');
        const request = store.get(companyId);

        request.onsuccess = (event) => {
            const user = event.target.result;
            if (user) {
                if (user.password === password) {
                    resolve(user);
                } else {
                    reject('Contrasea incorrecta');
                }
            } else {
                // Auto-register feature for easy MVP testing
                const newUser = { id: companyId, password: password };
                store.add(newUser);
                resolve(newUser);
            }
        };
        request.onerror = () => reject('Error en la base de datos');
    });
};`;

const newLogin = `const loginUser = async (companyId, password) => {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_id: companyId, password: password })
    });
    
    if (!response.ok) {
        throw new Error('Error de conexión con el servidor');
    }
    
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Error de autenticación');
    }
    
    return data.user;
};`;

if(code.includes('const loginUser = async (companyId, password) => {')) {
    // Regex replace to handle encoding differences in the old text
    code = code.replace(/const loginUser = async \(companyId, password\) => \{[\s\S]*?\}\;\n/m, newLogin + "\n");
    fs.writeFileSync('public/db.js', code);
    console.log("Replaced loginUser in db.js");
} else {
    console.log("Could not find loginUser");
}
