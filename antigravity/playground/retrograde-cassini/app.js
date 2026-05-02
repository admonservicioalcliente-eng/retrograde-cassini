// app.js - UI and Business Logic
let currentCompany = null;
let monthlyChartInstance = null;
let marginsChartInstance = null;
let marginsEvolutionChartInstance = null;
const currentYear = new Date().getFullYear();

// Utils
const showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.backgroundColor = type === 'error' ? 'var(--danger)' : 'var(--primary)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
};

const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
};

const calcDerivedMetrics = (rec) => {
    const ventas = parseFloat(rec.ventas_netas) || 0;
    const costo = parseFloat(rec.costo_ventas) || 0;
    const gastosAdmin = parseFloat(rec.gastos_administracion) || 0;
    const depAmor = parseFloat(rec.depreciacion_amortizacion) || 0;
    const ingFin = parseFloat(rec.ingresos_financieros) || 0;
    const gasFin = parseFloat(rec.gastos_financieros) || 0;
    const impuestos = parseFloat(rec.impuestos) || 0;

    const utilidadBruta = ventas - costo;
    const ebitda = utilidadBruta - gastosAdmin;
    const ebit = ebitda - depAmor;
    const uai = ebit + ingFin - gasFin; // Utilidad Antes de Impuestos
    const utilidadNeta = uai - impuestos;

    return { utilidadBruta, ebitda, ebit, uai, utilidadNeta, ventas };
};

// Navigation
const switchView = (viewId) => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
};

const switchSection = (sectionId) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(sectionId).classList.add('active');
    document.querySelector(`.nav-btn[data-target="${sectionId}"]`).classList.add('active');
    
    if (sectionId === 'dashboard-home') loadDashboard();
    if (sectionId === 'annual-statement') loadAnnualStatement();
    if (sectionId === 'margins-statement') loadMarginsStatement();
};

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        switchSection(e.target.dataset.target);
    });
});

// Auth
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('company-id').value.trim();
    const pwd = document.getElementById('password').value;

    try {
        const user = await loginUser(id, pwd);
        currentCompany = user.id;
        document.getElementById('current-company').textContent = `🏠 ${currentCompany}`;
        
        switchView('dashboard-view');
        switchSection('dashboard-home');
        showToast(`Bienvenido ${currentCompany}`);
    } catch (err) {
        showToast(err, 'error');
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    currentCompany = null;
    document.getElementById('login-form').reset();
    switchView('login-view');
});

// Data Entry
document.getElementById('entry-year').addEventListener('change', async (e) => {
    loadEntryData(e.target.value, document.getElementById('entry-month').value);
});
document.getElementById('entry-month').addEventListener('change', async (e) => {
    loadEntryData(document.getElementById('entry-year').value, e.target.value);
});

const loadEntryData = async (year, month) => {
    if(!currentCompany) return;
    try {
        const record = await getRecordMeta(currentCompany, parseInt(year), parseInt(month));
        const fields = ['ventas_netas', 'costo_ventas', 'gastos_administracion', 'depreciacion_amortizacion', 'ingresos_financieros', 'gastos_financieros', 'impuestos'];
        
        if (record) {
            fields.forEach(f => document.getElementById(f.replace('_', '-')).value = record[f]);
        } else {
            fields.forEach(f => document.getElementById(f.replace('_', '-')).value = '');
        }
    } catch (err) {}
};

document.getElementById('entry-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const year = parseInt(document.getElementById('entry-year').value);
    const month = parseInt(document.getElementById('entry-month').value);
    
    const record = {
        company_id: currentCompany,
        year,
        month,
        ventas_netas: parseFloat(document.getElementById('ventas-netas').value) || 0,
        costo_ventas: parseFloat(document.getElementById('costo-ventas').value) || 0,
        gastos_administracion: parseFloat(document.getElementById('gastos-admin').value) || 0,
        depreciacion_amortizacion: parseFloat(document.getElementById('depreciacion').value) || 0,
        ingresos_financieros: parseFloat(document.getElementById('ingresos-fin').value) || 0,
        gastos_financieros: parseFloat(document.getElementById('gastos-fin').value) || 0,
        impuestos: parseFloat(document.getElementById('impuestos').value) || 0
    };

    try {
        // 1. Guardar localmente (IndexedDB)
        await saveFinancialRecord(record);
        
        // 2. Enviar a la base de datos en la nube (Aiven) mediante la Netlify Function
        if (typeof enviarDatos === 'function') {
            const mappedForAiven = {
                empresa_id: currentCompany,
                clave_empresa: "default",
                anio: record.year,
                mes: record.month,
                ventas_netas: record.ventas_netas,
                costo_ventas: record.costo_ventas,
                gastos_administracion: record.gastos_administracion,
                depreciacion: record.depreciacion_amortizacion,
                ingresos_financieros: record.ingresos_financieros,
                gastos_financieros: record.gastos_financieros,
                impuesto_renta: record.impuestos
            };
            await enviarDatos(mappedForAiven);
        } else {
            console.warn("La función enviarDatos no está definida. Solo se guardó localmente.");
        }

        showToast('Registro guardado exitosamente');
    } catch (err) {
        showToast(err, 'error');
    }
});

// Dashboard
document.getElementById('dash-year').addEventListener('change', () => loadDashboard());
document.getElementById('table-year').addEventListener('change', () => loadAnnualStatement());
document.getElementById('margins-year').addEventListener('change', () => loadMarginsStatement());

const loadDashboard = async () => {
    const year = parseInt(document.getElementById('dash-year').value || currentYear);
    
    // FETCH FROM AIVEN
    let records = [];
    try {
        const response = await fetch(`/.netlify/functions/obtener-financiero?empresa_id=${currentCompany}&anio=${year}`);
        if(response.ok) {
            const aivenData = await response.json();
            // Map Aiven schema back to frontend schema
            records = aivenData.map(dbRow => ({
                company_id: dbRow.empresa_id,
                year: dbRow.anio,
                month: dbRow.mes,
                ventas_netas: dbRow.ventas_netas,
                costo_ventas: dbRow.costo_ventas,
                gastos_administracion: dbRow.gastos_administracion,
                depreciacion_amortizacion: dbRow.depreciacion,
                ingresos_financieros: dbRow.ingresos_financieros,
                gastos_financieros: dbRow.gastos_financieros,
                impuestos: dbRow.impuesto_renta
            }));
        } else {
            console.warn("No se pudo obtener datos de Aiven, leyendo local...");
            records = await getRecordsByYear(currentCompany, year);
        }
    } catch(e) {
        records = await getRecordsByYear(currentCompany, year);
    }
    
    let tIngresos = 0, tBruta = 0, tEbitda = 0, tNeta = 0;
    
    const monthlyData = Array(12).fill(null).map(() => ({ ventas: 0, neta: 0, ebitda: 0, ebit: 0 }));

    records.forEach(rec => {
        const metrics = calcDerivedMetrics(rec);
        tIngresos += metrics.ventas;
        tBruta += metrics.utilidadBruta;
        tEbitda += metrics.ebitda;
        tNeta += metrics.utilidadNeta;
        
        const m = rec.month - 1;
        monthlyData[m] = {
            ventas: metrics.ventas,
            neta: metrics.utilidadNeta,
            ebitda: metrics.ebitda,
            ebit: metrics.ebit
        };
    });

    // Update KPIs
    document.getElementById('kpi-ingresos').textContent = formatCurrency(tIngresos);
    document.getElementById('kpi-bruta').textContent = formatCurrency(tBruta);
    document.getElementById('kpi-ebitda').textContent = formatCurrency(tEbitda);
    document.getElementById('kpi-neta').textContent = formatCurrency(tNeta);

    // Update Charts
    updateCharts(monthlyData);
};

const updateCharts = (data) => {
    const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Chart 1: Evolución
    const ctx1 = document.getElementById('monthlyChart').getContext('2d');
    if(monthlyChartInstance) monthlyChartInstance.destroy();
    
    monthlyChartInstance = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Ingresos Totales',
                    data: data.map(d => d.ventas),
                    backgroundColor: 'rgba(99, 102, 241, 0.5)',
                    borderColor: '#6366f1',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Utilidad Neta',
                    data: data.map(d => d.neta),
                    type: 'line',
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } },
            color: '#94a3b8'
        }
    });

    // Chart 2: Margins
    const ctx2 = document.getElementById('marginsChart').getContext('2d');
    if(marginsChartInstance) marginsChartInstance.destroy();
    
    marginsChartInstance = new Chart(ctx2, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'EBITDA',
                    data: data.map(d => d.ebitda),
                    borderColor: '#f59e0b',
                    tension: 0.4
                },
                {
                    label: 'EBIT',
                    data: data.map(d => d.ebit),
                    borderColor: '#ef4444',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } },
            color: '#94a3b8'
        }
    });
};

// Annual Statement
const loadAnnualStatement = async () => {
    const year = parseInt(document.getElementById('table-year').value || currentYear);
    
    let records = [];
    try {
        const response = await fetch(`/.netlify/functions/obtener-financiero?empresa_id=${currentCompany}&anio=${year}`);
        if(response.ok) {
            const aivenData = await response.json();
            records = aivenData.map(dbRow => ({
                company_id: dbRow.empresa_id,
                year: dbRow.anio,
                month: dbRow.mes,
                ventas_netas: dbRow.ventas_netas,
                costo_ventas: dbRow.costo_ventas,
                gastos_administracion: dbRow.gastos_administracion,
                depreciacion_amortizacion: dbRow.depreciacion,
                ingresos_financieros: dbRow.ingresos_financieros,
                gastos_financieros: dbRow.gastos_financieros,
                impuestos: dbRow.impuesto_renta
            }));
        } else {
            records = await getRecordsByYear(currentCompany, year);
        }
    } catch(e) {
        records = await getRecordsByYear(currentCompany, year);
    }
    
    const fields = [
        { key: 'ventas_netas', label: '1. Ventas Netas' },
        { key: 'costo_ventas', label: '2. Costo de Ventas' },
        { key: 'utilidadBruta', label: 'Utilidad Bruta', derived: true, bold: true },
        { key: 'gastos_administracion', label: '3. Gastos de Adm.' },
        { key: 'ebitda', label: 'EBITDA', derived: true, bold: true },
        { key: 'depreciacion_amortizacion', label: '4. Dep. y Amort.' },
        { key: 'ebit', label: 'EBIT', derived: true, bold: true },
        { key: 'ingresos_financieros', label: '5. Ing. Financieros' },
        { key: 'gastos_financieros', label: '6. Gastos Financieros' },
        { key: 'uai', label: 'Utilidad Antes de Impuestos', derived: true, bold: true },
        { key: 'impuestos', label: '7. Impuestos' },
        { key: 'utilidadNeta', label: 'UTILIDAD NETA', derived: true, highlight: true }
    ];

    // Prepare map of month to data
    const mData = {};
    records.forEach(rec => {
        const metrics = calcDerivedMetrics(rec);
        mData[rec.month] = { ...rec, ...metrics };
    });

    let html = '';
    
    fields.forEach(field => {
        let rowClass = field.highlight ? 'row-total' : (field.bold ? 'row-header' : '');
        html += `<tr class="${rowClass}"><td>${field.label}</td>`;
        
        let rowTotal = 0;
        
        for (let m = 1; m <= 12; m++) {
            const mRecord = mData[m] || {};
            const val = mRecord[field.key] || 0;
            rowTotal += val;
            html += `<td>${val !== 0 ? formatCurrency(val) : '-'}</td>`;
        }
        
        html += `<td class="highlight">${formatCurrency(rowTotal)}</td></tr>`;
    });

    document.querySelector('#statement-table tbody').innerHTML = html;
};

// Margins Statement
const loadMarginsStatement = async () => {
    const year = parseInt(document.getElementById('margins-year').value || currentYear);
    
    let records = [];
    try {
        const response = await fetch(`/.netlify/functions/obtener-financiero?empresa_id=${currentCompany}&anio=${year}`);
        if(response.ok) {
            const aivenData = await response.json();
            records = aivenData.map(dbRow => ({
                company_id: dbRow.empresa_id,
                year: dbRow.anio,
                month: dbRow.mes,
                ventas_netas: dbRow.ventas_netas,
                costo_ventas: dbRow.costo_ventas,
                gastos_administracion: dbRow.gastos_administracion,
                depreciacion_amortizacion: dbRow.depreciacion,
                ingresos_financieros: dbRow.ingresos_financieros,
                gastos_financieros: dbRow.gastos_financieros,
                impuestos: dbRow.impuesto_renta
            }));
        } else {
            records = await getRecordsByYear(currentCompany, year);
        }
    } catch(e) {
        records = await getRecordsByYear(currentCompany, year);
    }
    
    const fields = [
        { key: 'costo_ventas', label: 'Costo de Ventas (%)', inverse: true },
        { key: 'utilidadBruta', label: 'Margen Bruto (%)', derived: true, bold: true },
        { key: 'gastos_administracion', label: 'Gastos de Adm. (%)', inverse: true },
        { key: 'ebitda', label: 'Margen EBITDA (%)', derived: true, bold: true },
        { key: 'depreciacion_amortizacion', label: 'Dep. y Amort. (%)', inverse: true },
        { key: 'ebit', label: 'Margen Operacional (EBIT) (%)', derived: true, bold: true },
        { key: 'ingresos_financieros', label: 'Ing. Financieros (%)' },
        { key: 'gastos_financieros', label: 'Gastos Financieros (%)', inverse: true },
        { key: 'uai', label: 'Margen UAI (%)', derived: true, bold: true },
        { key: 'impuestos', label: 'Impuestos (%)', inverse: true },
        { key: 'utilidadNeta', label: 'Margen Neto (%)', derived: true, highlight: true }
    ];

    // Prepare map of month to data
    const mData = {};
    records.forEach(rec => {
        const metrics = calcDerivedMetrics(rec);
        mData[rec.month] = { ...rec, ...metrics };
    });

    let html = '';
    
    const chartData = { labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'], bruto: [], ebitda: [], ebit: [], neto: [] };

    fields.forEach(field => {
        let rowClass = field.highlight ? 'row-total' : (field.bold ? 'row-header' : '');
        html += `<tr class="${rowClass}"><td>${field.label}</td>`;
        
        let sumMargin = 0;
        let count = 0;
        
        for (let m = 1; m <= 12; m++) {
            const mRecord = mData[m];
            if (mRecord && mRecord.ventas > 0) {
                const val = mRecord[field.key] || 0;
                const percent = (val / mRecord.ventas) * 100;
                sumMargin += percent;
                count++;
                
                // Color Logic
                let colorClass = '';
                if (!field.inverse && percent < 0) colorClass = 'text-danger';
                if (!field.inverse && percent > 20 && field.derived) colorClass = 'text-success'; // arbitrary good threshold

                html += `<td class="${colorClass}">${percent.toFixed(1)}%</td>`;

                // Collect for chart
                if (field.key === 'utilidadBruta') chartData.bruto.push(percent);
                if (field.key === 'ebitda') chartData.ebitda.push(percent);
                if (field.key === 'ebit') chartData.ebit.push(percent);
                if (field.key === 'utilidadNeta') chartData.neto.push(percent);
            } else {
                html += `<td>-</td>`;
                if (field.key === 'utilidadBruta') chartData.bruto.push(null);
                if (field.key === 'ebitda') chartData.ebitda.push(null);
                if (field.key === 'ebit') chartData.ebit.push(null);
                if (field.key === 'utilidadNeta') chartData.neto.push(null);
            }
        }
        
        const avgMargin = count > 0 ? (sumMargin / count).toFixed(1) : 0;
        let avgColorClass = '';
        if (!field.inverse && avgMargin < 0) avgColorClass = 'text-danger';
        html += `<td class="highlight ${avgColorClass}">${count > 0 ? avgMargin + '%' : '-'}</td></tr>`;
    });

    document.querySelector('#margins-table tbody').innerHTML = html;

    // Update Margins Evolution Chart
    const ctx = document.getElementById('marginsEvolutionChart').getContext('2d');
    if(marginsEvolutionChartInstance) marginsEvolutionChartInstance.destroy();
    
    marginsEvolutionChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [
                { label: 'Margen Bruto', data: chartData.bruto, borderColor: '#3b82f6', tension: 0.4 },
                { label: 'Margen EBITDA', data: chartData.ebitda, borderColor: '#f59e0b', tension: 0.4 },
                { label: 'Margen EBIT', data: chartData.ebit, borderColor: '#ef4444', tension: 0.4 },
                { label: 'Margen Neto', data: chartData.neto, borderColor: '#10b981', tension: 0.4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
        }
    });
};

// CSV Export
document.getElementById('export-margins-btn').addEventListener('click', () => {
    const table = document.getElementById('margins-table');
    let csvContent = "";
    const rows = table.querySelectorAll('tr');
    
    rows.forEach((row) => {
        const cols = row.querySelectorAll('td, th');
        const rowData = Array.from(cols).map(c => `"${c.innerText}"`).join(",");
        csvContent += rowData + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `margenes_${currentCompany}_${document.getElementById('margins-year').value}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Init setup
document.getElementById('dash-year').value = currentYear;
document.getElementById('entry-year').value = currentYear;
document.getElementById('table-year').value = currentYear;
document.getElementById('margins-year').value = currentYear;
// Make chart text color globally white for dark theme
Chart.defaults.color = '#94a3b8';
