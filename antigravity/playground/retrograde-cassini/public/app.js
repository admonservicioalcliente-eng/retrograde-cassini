console.log("Archivo app.js cargado correctamente");
// app.js - UI and Business Logic
let currentCompany = null;
let monthlyChartInstance = null;
let marginsChartInstance = null;
let marginsEvolutionChartInstance = null;
const currentYear = new Date().getFullYear();

// Utils    y
const showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    const colors = {
        success: 'var(--primary)',
        error: 'var(--danger)',
        info: '#2563eb'
    };
    toast.style.backgroundColor = colors[type] || colors.success;
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
    const impuestoProvisionRaw = parseFloat(rec.impuesto_provision);
    const impuestoRenta = parseFloat(rec.impuesto_renta) || 0;
    const impuestoProvision = Number.isFinite(impuestoProvisionRaw)
        ? impuestoProvisionRaw
        : (impuestoRenta ? impuestoRenta / 12 : 0);

    const utilidadBruta = ventas - costo;
    const ebitda = utilidadBruta - gastosAdmin;
    const ebit = ebitda - depAmor;
    const uai = ebit + ingFin - gasFin; // Utilidad Antes de Impuestos
    const utilidadNeta = uai - impuestoProvision;
    const tei = uai !== 0 ? impuestoRenta / uai : null;

    return {
        utilidadBruta,
        ebitda,
        ebit,
        uai,
        utilidadNeta,
        ventas,
        impuestoProvision,
        impuesto_provision: impuestoProvision,
        impuestoRenta,
        tei
    };
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
    const activeNavBtn = document.querySelector(`.nav-btn[data-target="${sectionId}"]`);
    if (activeNavBtn) activeNavBtn.classList.add('active');

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
        document.getElementById('current-company').textContent = `🏦 ${currentCompany}`;

        switchView('dashboard-view');
        
        if (currentCompany === 'SUPERUSUARIO') {
            switchSection('admin-view');
            loadAdminData();
        } else {
            switchSection('dashboard-home');
        }

        showToast(`Bienvenido ${currentCompany}`);
    } catch (err) {
        const message = err && err.message ? err.message : err;
        const isInfoMessage = message === 'Tu cuenta ha sido registrada y está pendiente de autorización por el administrador.' || message === 'Tu cuenta está pendiente de autorización por el administrador.' || message === 'Tu cuenta ha sido rechazada por el administrador.';
        showToast(message, isInfoMessage ? 'info' : 'error');
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
    if (!currentCompany) return;
    try {
        const record = await getRecordMeta(currentCompany, parseInt(year), parseInt(month));

        if (record) {
            document.getElementById('ventas-netas').value = record.ventas_netas || '';
            document.getElementById('costo-ventas').value = record.costo_ventas || '';
            document.getElementById('gastos-admin').value = record.gastos_administracion || '';
            document.getElementById('depreciacion').value = record.depreciacion_amortizacion || '';
            document.getElementById('ingresos-fin').value = record.ingresos_financieros || '';
            document.getElementById('gastos-fin').value = record.gastos_financieros || '';
            document.getElementById('impuesto-renta-anual').value = record.impuesto_renta != null ? record.impuesto_renta : '';
            document.getElementById('impuesto-provision').value = record.impuesto_provision != null ? record.impuesto_provision : (record.impuesto_renta ? (parseFloat(record.impuesto_renta) / 12).toFixed(2) : '');
        } else {
            document.getElementById('ventas-netas').value = '';
            document.getElementById('costo-ventas').value = '';
            document.getElementById('gastos-admin').value = '';
            document.getElementById('depreciacion').value = '';
            document.getElementById('ingresos-fin').value = '';
            document.getElementById('gastos-fin').value = '';
            document.getElementById('impuesto-renta-anual').value = '';
            document.getElementById('impuesto-provision').value = '';
        }
    } catch (err) {
        console.error('Error cargando datos del mes:', err);
    }
};

document.getElementById('entry-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const year = parseInt(document.getElementById('entry-year').value);
    const month = parseInt(document.getElementById('entry-month').value);

    const impuestoRentaAnualValue = parseFloat(document.getElementById('impuesto-renta-anual').value);
    const impuestoRentaAnual = Number.isFinite(impuestoRentaAnualValue) ? impuestoRentaAnualValue : 0;
    let impuestoProvision = parseFloat(document.getElementById('impuesto-provision').value);
    if (!Number.isFinite(impuestoProvision)) {
        impuestoProvision = impuestoRentaAnual ? impuestoRentaAnual / 12 : 0;
    }

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
        impuesto_renta: impuestoRentaAnual,
        impuesto_provision: impuestoProvision
    };

    try {
        // 1. Guardar localmente (IndexedDB)
        await saveFinancialRecord(record);

        // 2. Enviar a la base de datos en la nube (Aiven) mediante la Netlify Function
        if (typeof enviarDatoss === 'function') {
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
                impuesto_renta: record.impuesto_renta,
                impuesto_provision: record.impuesto_provision
            };
            await enviarDatoss(mappedForAiven);
        } else {
            console.warn("La función enviarDatoss no está definida. Solo se guardó localmente.");
        }

        showToast('Registro guardado exitosamente');
    } catch (err) {
        showToast(err, 'error');
    }
});

// Dashboard
document.getElementById('dash-year').addEventListener('change', () => loadDashboard());
document.getElementById('dash-impuesto-renta').addEventListener('change', async () => {
    const year = parseInt(document.getElementById('dash-year').value || currentYear);
    const newTax = parseFloat(document.getElementById('dash-impuesto-renta').value) || 0;
    
    // Save to localStorage
    const key = `impuesto_renta_${currentCompany}_${year}`;
    localStorage.setItem(key, newTax);
    
    // Reload dashboard to recalculate TEI
    loadDashboard();
});
document.getElementById('table-year').addEventListener('change', () => loadAnnualStatement());
document.getElementById('margins-year').addEventListener('change', () => loadMarginsStatement());

const loadDashboard = async () => {
    const year = parseInt(document.getElementById('dash-year').value || currentYear);

    // FETCH FROM AIVEN
    let records = [];
    try {
        const response = await fetch(`/obtener-financiero?empresa_id=${currentCompany}&anio=${year}`);
        if (response.ok) {
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
                impuesto_renta: dbRow.impuesto_renta,
                impuesto_provision: dbRow.impuesto_provision
            }));
        } else {
            console.warn("No se pudo obtener datos de Aiven, leyendo local...");
            records = await getRecordsByYear(currentCompany, year);
        }
    } catch (e) {
        records = await getRecordsByYear(currentCompany, year);
    }

    let tIngresos = 0, tBruta = 0, tEbitda = 0, tNeta = 0;
    let totalUAI = 0;
    let annualTax = null;

    const monthlyData = Array(12).fill(null).map(() => ({ ventas: 0, neta: 0, ebitda: 0, ebit: 0 }));

    records.forEach(rec => {
        const metrics = calcDerivedMetrics(rec);
        tIngresos += metrics.ventas;
        tBruta += metrics.utilidadBruta;
        tEbitda += metrics.ebitda;
        tNeta += metrics.utilidadNeta;
        totalUAI += metrics.uai;

        if (metrics.impuestoRenta != null) {
            if (annualTax === null || (annualTax === 0 && metrics.impuestoRenta !== 0)) {
                annualTax = metrics.impuestoRenta;
            }
        }

        const m = rec.month - 1;
        monthlyData[m] = {
            ventas: metrics.ventas,
            neta: metrics.utilidadNeta,
            ebitda: metrics.ebitda,
            ebit: metrics.ebit
        };
    });

    // Check for saved annual tax value in localStorage
    const year = parseInt(document.getElementById('dash-year').value || currentYear);
    const storageKey = `impuesto_renta_${currentCompany}_${year}`;
    const storedTax = localStorage.getItem(storageKey);
    const finalAnnualTax = storedTax !== null ? parseFloat(storedTax) : annualTax;

    const teiValue = totalUAI !== 0 && finalAnnualTax !== null ? finalAnnualTax / totalUAI : null;
    document.getElementById('dash-impuesto-renta').value = finalAnnualTax !== null ? finalAnnualTax.toFixed(2) : '';
    document.getElementById('dashboard-tei').value = teiValue !== null ? `${(teiValue * 100).toFixed(1)} %` : '-';

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
    if (monthlyChartInstance) monthlyChartInstance.destroy();

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
    if (marginsChartInstance) marginsChartInstance.destroy();

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
        const response = await fetch(`/obtener-financiero?empresa_id=${currentCompany}&anio=${year}`);
        if (response.ok) {
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
                impuesto_renta: dbRow.impuesto_renta,
                impuesto_provision: dbRow.impuesto_provision
            }));
        } else {
            records = await getRecordsByYear(currentCompany, year);
        }
    } catch (e) {
        records = await getRecordsByYear(currentCompany, year);
    }

    const fields = [
        { key: 'ventas_netas', label: '1. Ingresos Netos' },
        { key: 'costo_ventas', label: '2. Costo en Ingresos' },
        { key: 'utilidadBruta', label: 'Utilidad Bruta', derived: true, bold: true },
        { key: 'gastos_administracion', label: '3. Gastos de Adm.' },
        { key: 'ebitda', label: 'EBITDA', derived: true, bold: true },
        { key: 'depreciacion_amortizacion', label: '4. Dep. y Amort.' },
        { key: 'ebit', label: 'EBIT', derived: true, bold: true },
        { key: 'ingresos_financieros', label: '5. Ing. Financieros' },
        { key: 'gastos_financieros', label: '6. Gastos Financieros' },
        { key: 'uai', label: 'Utilidad Antes de Impuestos', derived: true, bold: true },
        { key: 'impuesto_provision', label: '8. Impuesto (Provisión)' },
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
            const val = parseFloat(mRecord[field.key]) || 0;
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
        const response = await fetch(`/obtener-financiero?empresa_id=${currentCompany}&anio=${year}`);
        if (response.ok) {
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
                impuesto_renta: dbRow.impuesto_renta,
                impuesto_provision: dbRow.impuesto_provision
            }));
        } else {
            records = await getRecordsByYear(currentCompany, year);
        }
    } catch (e) {
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
        { key: 'impuesto_provision', label: 'Impuesto (Provisión) (%)', inverse: true },
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
                const val = parseFloat(mRecord[field.key]) || 0;
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
    if (marginsEvolutionChartInstance) marginsEvolutionChartInstance.destroy();

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

/*
const enviarDatos = async (objetoFinanciero) => {
    // La URL debe ser la de tu Cloudflare Worker o Netlify Function
    const response = await fetch('/guardar-financiero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objetoFinanciero)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error en el servidor');
    }

    return await response.json();
};
*/


document.getElementById('btn-borrar-mes').addEventListener('click', async () => {
    const year = parseInt(document.getElementById('entry-year').value);
    const month = parseInt(document.getElementById('entry-month').value);
    
    if(!confirm('�Est�s seguro de que quieres borrar todos los datos del mes ' + month + ' del a�o ' + year + '?')) return;
    
    try {
        // 1. Borrar localmente
        await deleteFinancialRecord(currentCompany, year, month);
        
        // 2. Borrar en la nube
        if(typeof borrarDatoss === 'function') {
            await borrarDatoss({ empresa_id: currentCompany, anio: year, mes: month });
        }
        
        document.getElementById('entry-form').reset();
        document.getElementById('entry-year').value = currentYear;
        document.getElementById('entry-month').value = 1;
        alert('Mes borrado exitosamente.');
    } catch(e) {
        console.error(e);
        alert('Error al borrar: ' + e.message);
    }
});





// --- Lógica de Carga de Archivo Plano ---
const downloadTemplateBtn = document.getElementById('download-template-btn');
const fileUploadInput = document.getElementById('file-upload');
const processFileBtn = document.getElementById('process-file-btn');

if (downloadTemplateBtn) {
    downloadTemplateBtn.addEventListener('click', () => {
        const headers = ["Anio", "Mes", "Ingresos_Netos", "Costo_en_Ingresos", "Gastos_Administracion", "Depreciacion_Amortizacion", "Ingresos_Financieros", "Gastos_Financieros", "Impuesto_Renta_Anual", "Impuesto_Provision"];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n2024,1,10000,4000,1000,500,200,100,1200,100";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_financiera.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

if (fileUploadInput) {
    fileUploadInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processFileBtn.style.display = 'block';
        } else {
            processFileBtn.style.display = 'none';
        }
    });
}

if (processFileBtn) {
    processFileBtn.addEventListener('click', () => {
        const file = fileUploadInput.files[0];
        if (!file) return;

        if (typeof Papa === 'undefined') {
            showToast("La librería para procesar CSV no está cargada.", "error");
            return;
        }

        processFileBtn.disabled = true;
        processFileBtn.textContent = 'Procesando...';

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async function(results) {
                const data = results.data;
                let successCount = 0;
                let errorCount = 0;

                for (const row of data) {
                    try {
                        const anio = parseInt(row["Anio"]);
                        const mes = parseInt(row["Mes"]);
                        if (!anio || !mes || isNaN(anio) || isNaN(mes)) continue;

                        const mappedForAiven = {
                            empresa_id: currentCompany,
                            clave_empresa: "default",
                            anio: anio,
                            mes: mes,
                            ventas_netas: parseFloat(row["Ingresos_Netos"]) || 0,
                            costo_ventas: parseFloat(row["Costo_en_Ingresos"]) || 0,
                            gastos_administracion: parseFloat(row["Gastos_Administracion"]) || 0,
                            depreciacion: parseFloat(row["Depreciacion_Amortizacion"]) || 0,
                            ingresos_financieros: parseFloat(row["Ingresos_Financieros"]) || 0,
                            gastos_financieros: parseFloat(row["Gastos_Financieros"]) || 0,
                            impuesto_renta: parseFloat(row["Impuesto_Renta_Anual"]) || 0,
                            impuesto_provision: parseFloat(row["Impuesto_Provision"]) || 0
                        };

                        if (typeof enviarDatoss === 'function') {
                            await enviarDatoss(mappedForAiven);
                        }

                        const recordForLocal = {
                            id: currentCompany + "-" + anio + "-" + mes,
                            company_id: currentCompany,
                            year: anio,
                            month: mes,
                            ventas_netas: mappedForAiven.ventas_netas,
                            costo_ventas: mappedForAiven.costo_ventas,
                            gastos_administracion: mappedForAiven.gastos_administracion,
                            depreciacion_amortizacion: mappedForAiven.depreciacion,
                            ingresos_financieros: mappedForAiven.ingresos_financieros,
                            gastos_financieros: mappedForAiven.gastos_financieros,
                            impuesto_renta: mappedForAiven.impuesto_renta,
                            impuesto_provision: mappedForAiven.impuesto_provision,
                            timestamp: Date.now()
                        };
                        
                        if (typeof saveFinancialRecord === 'function') {
                            await saveFinancialRecord(recordForLocal);
                        }
                        
                        successCount++;
                    } catch(err) {
                        console.error("Error en fila CSV:", row, err);
                        errorCount++;
                    }
                }

                showToast("Proceso completado. Guardados: " + successCount + ", Errores: " + errorCount);
                processFileBtn.disabled = false;
                processFileBtn.textContent = 'Procesar Archivo CSV';
                fileUploadInput.value = '';
                processFileBtn.style.display = 'none';
                
                if (typeof loadAnnualStatement === 'function') {
                    loadAnnualStatement();
                }
            }
        });
    });
}




// --- Admin Logic ---
const renderAdminTable = (tbodyId, empresas, emptyMessage) => {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!Array.isArray(empresas) || empresas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">${emptyMessage}</td></tr>`;
        return;
    }

    empresas.forEach(emp => {
        const tr = document.createElement('tr');
        const status = emp.status || (emp.is_authorized ? 'approved' : 'pending');
        const isApproved = status === 'approved';

        const tdId = document.createElement('td');
        tdId.textContent = emp.empresa_id;

        const tdPassword = document.createElement('td');
        tdPassword.textContent = emp.password_hash || '—';

        const tdStatus = document.createElement('td');
        tdStatus.textContent = isApproved ? '✅ Autorizado' : '⏳ Pendiente';

        const tdAction = document.createElement('td');
        const actionBtn = document.createElement('button');
        actionBtn.className = isApproved ? 'btn-secondary' : 'btn-primary';
        actionBtn.style.padding = '0.5rem 1rem';
        actionBtn.style.fontSize = '0.8rem';
        actionBtn.textContent = isApproved ? 'Revocar' : 'Aprobar';
        actionBtn.onclick = () => isApproved ? revokeEmpresa(emp.empresa_id) : approveEmpresa(emp.empresa_id);
        tdAction.appendChild(actionBtn);

        if (isApproved) {
            const resetBtn = document.createElement('button');
            resetBtn.className = 'btn-secondary';
            resetBtn.style.padding = '0.5rem 1rem';
            resetBtn.style.fontSize = '0.8rem';
            resetBtn.style.marginLeft = '0.5rem';
            resetBtn.textContent = 'Cambiar clave';
            resetBtn.onclick = () => resetEmpresaPassword(emp.empresa_id);
            tdAction.appendChild(resetBtn);
        }

        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'btn-danger';
        rejectBtn.style.padding = '0.5rem 1rem';
        rejectBtn.style.fontSize = '0.8rem';
        rejectBtn.style.marginLeft = '0.5rem';
        rejectBtn.textContent = 'Rechazar';
        rejectBtn.onclick = () => rechazarEmpresa(emp.empresa_id);
        tdAction.appendChild(rejectBtn);

        tr.appendChild(tdId);
        tr.appendChild(tdPassword);
        tr.appendChild(tdStatus);
        tr.appendChild(tdAction);
        tbody.appendChild(tr);
    });
};

const loadAdminData = async () => {
    try {
        const response = await fetch('/api/get-empresas');
        if (!response.ok) throw new Error('Error al obtener empresas');
        const data = await response.json();
        const empresas = Array.isArray(data) ? data : [];
        const pendingEmpresas = empresas.filter(emp => {
            const status = emp.status || (emp.is_authorized ? 'approved' : 'pending');
            return status !== 'approved' && status !== 'rejected';
        });
        const approvedEmpresas = empresas.filter(emp => {
            const status = emp.status || (emp.is_authorized ? 'approved' : 'pending');
            return status === 'approved';
        });

        renderAdminTable('admin-pendientes-tbody', pendingEmpresas, 'No hay cuentas pendientes');
        renderAdminTable('admin-aprobadas-tbody', approvedEmpresas, 'No hay empresas aprobadas');
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
        showToast(`${empresa_id} ha sido autorizado`);
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
        showToast(`Se ha revocado el acceso a ${empresa_id}`);
        loadAdminData();
    } catch(err) {
        showToast(err.message, 'error');
    }
};

const resetEmpresaPassword = async (empresa_id) => {
    const newPassword = prompt(`Ingrese la nueva contraseña para ${empresa_id}:`);
    if (newPassword === null) return;
    if (!newPassword.trim()) {
        showToast('La contraseña no puede estar vacía.', 'error');
        return;
    }

    try {
        const response = await fetch('/api/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empresa_id, password: newPassword.trim() })
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al actualizar la contraseña');
        }
        showToast(`Contraseña actualizada para ${empresa_id}`);
        loadAdminData();
    } catch(err) {
        showToast(err.message, 'error');
    }
};


const rechazarEmpresa = async (empresa_id) => {
    if (!confirm(`¿Estás seguro de RECHAZAR y eliminar a ${empresa_id}? Esta acción no se puede deshacer.`)) return;
    try {
        const response = await fetch('/api/delete-empresa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empresa_id })
        });
        if (!response.ok) throw new Error('Error al rechazar');
        showToast(`${empresa_id} ha sido rechazado y eliminado`);
        loadAdminData();
    } catch(err) {
        showToast(err.message, 'error');
    }
};
