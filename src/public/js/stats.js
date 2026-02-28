const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
let charts = {};

function getChartColors() {
    const isDarkTheme = document.body.classList.contains('dark-theme');
    return {
        textColor: isDarkTheme ? '#e2e8f0' : '#475569',
        gridColor: isDarkTheme ? '#334155' : '#f1f5f9',
        tooltipBg: isDarkTheme ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        tooltipText: isDarkTheme ? '#ffffff' : '#0f172a'
    };
}

// Opciones comunes para tooltips modernos
const modernTooltip = {
    backgroundColor: getChartColors().tooltipBg,
    titleColor: getChartColors().tooltipText,
    bodyColor: getChartColors().tooltipText,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    padding: 12,
    cornerRadius: 8,
    boxPadding: 6
};

document.addEventListener('DOMContentLoaded', () => {
    loadTopSelling();
    loadDefaultSeasonality();
    loadGlobalData();

    const observer = new MutationObserver(() => {
        Object.keys(charts).forEach(canvasId => {
            charts[canvasId].destroy();
            delete charts[canvasId];
        });
        modernTooltip.backgroundColor = getChartColors().tooltipBg;
        modernTooltip.titleColor = getChartColors().tooltipText;
        modernTooltip.bodyColor = getChartColors().tooltipText;
        loadTopSelling();
        loadGlobalData();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
});

function loadGlobalData() {
    const year = document.getElementById('globalYear').value;
    loadMonthlyEgresses(year);
    loadBranchPerformance(year);
    if (document.getElementById('productSearchInput').value.trim() !== '') {
        loadProductSeasonality();
    }
}

async function loadTopSelling() {
    try {
        const res = await fetch('/api/statistics/top-selling-products');
        const json = await res.json();
        if (json.status === 'success' && json.data) {
            renderPieChart('topSellingChart', json.data);
        }
    } catch (e) { console.error(e); }
}

async function loadMonthlyEgresses(year) {
    try {
        const res = await fetch(`/api/statistics/monthly-egresses?year=${year}`);
        const json = await res.json();
        if (res.ok || json.status === 'success') {
            const dataPoints = fillMonthlyData(json.data, 'total_items_sold');
            // Usamos tu color primary (#214d5c convertido a rgba para el JS)
            renderLineChart('monthlyEgressesChart', dataPoints, 'Ventas Totales', 'rgba(33, 77, 92, 1)');
        }
    } catch (e) { console.error(e); }
}

async function loadBranchPerformance(year) {
    try {
        let allBranches = [];
        try {
            const branchRes = await fetch('/api/branches/catalog');
            const branchJson = await branchRes.json();
            if (branchJson.status === 'success') allBranches = branchJson.data;
        } catch (e) { }

        const res = await fetch(`/api/statistics/branch-performance?year=${year}`);
        const json = await res.json();
        if (res.ok || json.status === 'success') {
            renderMultiLineChart('branchPerformanceChart', json.data, allBranches);
        }
    } catch (e) { console.error(e); }
}

async function loadDefaultSeasonality() {
    try {
        const res = await fetch('/api/products/catalog');
        const json = await res.json();
        if (json.status === 'success' && json.data.length > 0) {
            const prod = json.data[0];
            document.getElementById('productSearchInput').value = prod.name || prod.product_name;
            loadProductSeasonality(prod.id, prod.name || prod.product_name);
        }
    } catch (e) { }
}

async function loadProductSeasonality(directId = null, directName = null) {
    const searchInput = document.getElementById('productSearchInput').value.trim();
    const year = document.getElementById('globalYear').value;

    if (!directId && !searchInput) return;

    let productId = directId;
    let productName = directName;

    if (!productId) {
        try {
            const searchRes = await fetch(`/api/products/catalog?search=${encodeURIComponent(searchInput)}`);
            const searchJson = await searchRes.json();
            if (searchJson.status === 'success' && searchJson.data.length > 0) {
                productId = searchJson.data[0].id;
                productName = searchJson.data[0].name || searchJson.data[0].product_name;
                document.getElementById('productSearchInput').value = productName;
            } else {
                return alert('No se encontró ningún producto.');
            }
        } catch (e) { return; }
    }

    try {
        const res = await fetch(`/api/statistics/product-seasonality/${productId}?year=${year}`);
        const json = await res.json();
        if (res.ok || json.status === 'success') {
            const dataPoints = fillMonthlyData(json.data, 'total_sold');
            renderLineChart('seasonalityChart', dataPoints, productName, 'rgba(16, 185, 129, 1)'); // Verde
        }
    } catch (e) { }
}

function destroyChartIfExists(canvasId) {
    if (charts[canvasId]) charts[canvasId].destroy();
}

function fillMonthlyData(rawData, valueKey) {
    const dataPoints = Array(12).fill(0);
    rawData.forEach(item => {
        const indexMes = parseInt(item.month) - 1;
        if (indexMes >= 0 && indexMes < 12) dataPoints[indexMes] = parseFloat(item[valueKey]);
    });
    return dataPoints;
}

// DOUGHNUT: Estética Moderna
function renderPieChart(canvasId, data) {
    destroyChartIfExists(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    const colors = getChartColors();

    charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(item => item.product_name),
            datasets: [{
                data: data.map(item => item.total_quantity),
                backgroundColor: ['#214d5c', '#397184', '#10b981', '#f59e0b', '#8b5cf6'],
                borderWidth: 0, // Sin bordes
                borderRadius: 4, // Bordes redondeados adentro
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%', // Centro más hueco (estilo anillo fino)
            plugins: {
                legend: { position: 'right', labels: { color: colors.textColor, usePointStyle: true, boxWidth: 8 } },
                tooltip: modernTooltip
            }
        }
    });
}

// LINEA SIMPLE (Con Gradiente Moderno)
function renderLineChart(canvasId, dataPoints, label, colorRgba) {
    destroyChartIfExists(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    const colors = getChartColors();

    // Crear Gradiente
    let gradient = ctx.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, colorRgba.replace('1)', '0.4)')); // 40% opacidad arriba
    gradient.addColorStop(1, colorRgba.replace('1)', '0.0)')); // 0% opacidad abajo

    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: label,
                data: dataPoints,
                borderColor: colorRgba,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4, // Curvas muy suaves
                pointBackgroundColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: modernTooltip }, // Oculto leyenda por ser 1 sola línea
            scales: {
                x: { ticks: { color: colors.textColor }, grid: { display: false } }, // Sin grilla vertical (más limpio)
                y: { beginAtZero: true, min: 0, ticks: { color: colors.textColor, stepSize: 1 }, grid: { color: colors.gridColor, borderDash: [5, 5] } } // Grilla horizontal punteada
            }
        }
    });
}

// LINEA MULTIPLE (Sucursales)
function renderMultiLineChart(canvasId, rawData, allBranches) {
    destroyChartIfExists(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    const colors = getChartColors();

    const branchesData = {};
    if (allBranches && allBranches.length > 0) {
        allBranches.forEach(b => { branchesData[b.name] = Array(12).fill(0); });
    }

    rawData.forEach(row => {
        if (!branchesData[row.branch_name]) branchesData[row.branch_name] = Array(12).fill(0);
        const indexMes = parseInt(row.month) - 1;
        if (indexMes >= 0 && indexMes < 12) branchesData[row.branch_name][indexMes] = parseFloat(row.total_items_sold);
    });

    const colorScheme = ['#214d5c', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const datasets = Object.keys(branchesData).map((branchName, index) => {
        const color = colorScheme[index % colorScheme.length];
        return {
            label: branchName,
            data: branchesData[branchName],
            borderColor: color,
            backgroundColor: color,
            borderWidth: 3,
            tension: 0.4, // Suave
            pointStyle: 'circle',
            pointBackgroundColor: '#fff',
            pointBorderColor: color,
            pointBorderWidth: 2,
            pointRadius: 4
        };
    });

    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: { labels: meses, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: colors.textColor, usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 10 } },
                tooltip: { ...modernTooltip, mode: 'index', intersect: false } // Muestra todos los datos de ese mes juntos
            },
            scales: {
                x: { ticks: { color: colors.textColor }, grid: { display: false } },
                y: { beginAtZero: true, min: 0, ticks: { color: colors.textColor, stepSize: 1 }, grid: { color: colors.gridColor, borderDash: [5, 5] } }
            }
        }
    });
}