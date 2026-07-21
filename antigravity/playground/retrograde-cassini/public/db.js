// db.js - IndexedDB Logic
const DB_NAME = 'FinAppDB';
const DB_VERSION = 1;

const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Store for Companies
            if (!db.objectStoreNames.contains('companies')) {
                db.createObjectStore('companies', { keyPath: 'id' });
            }

            // Store for Financial Records
            if (!db.objectStoreNames.contains('financial_records')) {
                const store = db.createObjectStore('financial_records', { keyPath: 'id' });
                store.createIndex('company_id', 'company_id', { unique: false });
                store.createIndex('year', 'year', { unique: false });
                store.createIndex('company_year', ['company_id', 'year'], { unique: false });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject('Error abriendo IndexedDB: ' + event.target.error);
        };
    });
};

const loginUser = async (companyId, password) => {
    // Si la empresa es DEMO, permitir acceso inmediato de pruebas sin requerir autorización
    if (companyId.toUpperCase() === 'DEMO') {
        return { id: 'DEMO' };
    }
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
};

const getRecordsByYear = async (companyId, year) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['financial_records'], 'readonly');
        const store = transaction.objectStore('financial_records');
        const index = store.index('company_year');
        const request = index.getAll([companyId, parseInt(year)]);

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = () => reject('Error leyendo registros');
    });
};

const getRecordMeta = async (companyId, year, month) => {
    const db = await initDB();
    const id = `${companyId}-${year}-${month}`;
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['financial_records'], 'readonly');
        const store = transaction.objectStore('financial_records');
        const request = store.get(id);

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = () => reject('Error obteniendo registro');
    });
};

const saveFinancialRecord = async (record) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['financial_records'], 'readwrite');
        const store = transaction.objectStore('financial_records');
        
        // Ensure ID is set
        record.id = `${record.company_id}-${record.year}-${record.month}`;
        
        const request = store.put(record);

        request.onsuccess = () => resolve();
        request.onerror = () => reject('Error guardando registro');
    });
};

const deleteFinancialRecord = async (companyId, year, month) => {
    const db = await initDB();
    const id = `${companyId}-${year}-${month}`;
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['financial_records'], 'readwrite');
        const store = transaction.objectStore('financial_records');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject('Error borrando registro');
    });
};
