const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
let charts = {};

// Detectar dark theme y obtener colores apropiados
function getChartColors() {
    const isDarkTheme = document.body.classList.contains('dark-theme');
    return {
        textColor: isDarkTheme ? '#e2e8f0' : '#1e293b',
        gridColor: isDarkTheme ? '#334155' : '#e2e8f0',
        backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff'
    };
}

document.addEventListener('DOMContentLoaded', () => {
    loadGlobalData();
    loadTopSelling();
    
    // Observer para detectar cambios de tema
    const observer = new MutationObserver(() => {
        Object.keys(charts).forEach(canvasId => {
            charts[canvasId].destroy();
            delete charts[canvasId];
        });
        loadGlobalData();
        loadTopSelling();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
});

// --- CARGA DE DATOS (FETCH) ---

function loadGlobalData() {
    const year = document.getElementById('globalYear').value;

    loadMonthlyEgresses(year);
    loadBranchPerformance(year);

    if (document.getElementById('productIdInput').value) {
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
    } catch (error) { console.error('Error Top Selling:', error); }
}

async function loadMonthlyEgresses(year) {
    try {
        const res = await fetch(`/api/statistics/monthly-egresses?year=${year}`);
        const json = await res.json();
        if (res.ok || json.status === 'success') {
            const dataPoints = fillMonthlyData(json.data, 'total_items_sold');
            renderLineChart('monthlyEgressesChart', dataPoints, 'Ventas Totales (Unidades)', '#2563eb');
        } else {
            console.error('Error Egresos Zod:', json);
        }
    } catch (error) { console.error('Error Egresos Mensuales:', error); }
}

async function loadBranchPerformance(year) {
    try {
        const res = await fetch(`/api/statistics/branch-performance?year=${year}`);
        const json = await res.json();
        if (res.ok || json.status === 'success') {
            renderMultiLineChart('branchPerformanceChart', json.data);
        } else {
            console.error('Error Sucursales Zod:', json);
        }
    } catch (error) { console.error('Error Rendimiento por Sucursal:', error); }
}

async function loadProductSeasonality() {
    const productId = document.getElementById('productIdInput').value;
    const year = document.getElementById('globalYear').value;

    if (!productId) return alert("Ingresá un ID de producto válido.");

    try {
        const res = await fetch(`/api/statistics/product-seasonality/${productId}?year=${year}`);
        const json = await res.json();

        if (res.ok || json.status === 'success') {
            const dataPoints = fillMonthlyData(json.data, 'total_sold');
            renderLineChart('seasonalityChart', dataPoints, `Producto ID: ${productId}`, '#10b981');
        } else {
            alert('Error: ' + (json.message || 'Revisa el ID ingresado'));
        }
    } catch (error) { console.error('Error Estacionalidad:', error); }
}

// --- RENDERIZADO DE CHART.JS ---

function destroyChartIfExists(canvasId) {
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
}

function fillMonthlyData(rawData, valueKey) {
    const dataPoints = Array(12).fill(0);
    rawData.forEach(item => {
        const indexMes = parseInt(item.month) - 1;
        if (indexMes >= 0 && indexMes < 12) {
            dataPoints[indexMes] = parseFloat(item[valueKey]);
        }
    });
    return dataPoints;
}

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
                backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'],
                hoverOffset: 4
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    position: 'right',
                    labels: { color: colors.textColor, font: { size: 12 } }
                }
            }
        }
    });
}

function renderLineChart(canvasId, dataPoints, label, colorStr) {
    destroyChartIfExists(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    const colors = getChartColors();

    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: label,
                data: dataPoints,
                borderColor: colorStr,
                backgroundColor: colorStr + '20',
                fill: true,
                tension: 0.3
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: colors.textColor } }
            },
            scales: {
                x: { 
                    ticks: { color: colors.textColor },
                    grid: { color: colors.gridColor, drawBorder: false }
                },
                y: { 
                    ticks: { color: colors.textColor },
                    grid: { color: colors.gridColor, drawBorder: false }
                }
            }
        }
    });
}

function renderMultiLineChart(canvasId, rawData) {
    destroyChartIfExists(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    const colors = getChartColors();

    const branches = {};
    rawData.forEach(row => {
        if (!branches[row.branch_name]) branches[row.branch_name] = Array(12).fill(0);
        const indexMes = parseInt(row.month) - 1;
        if (indexMes >= 0 && indexMes < 12) {
            branches[row.branch_name][indexMes] = parseFloat(row.total_items_sold);
        }
    });

    const colorScheme = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
    const datasets = Object.keys(branches).map((branchName, index) => {
        return {
            label: branchName,
            data: branches[branchName],
            borderColor: colorScheme[index % colorScheme.length],
            backgroundColor: 'transparent',
            tension: 0.3
        };
    });

    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: { labels: meses, datasets: datasets },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: colors.textColor } }
            },
            scales: {
                x: { 
                    ticks: { color: colors.textColor },
                    grid: { color: colors.gridColor, drawBorder: false }
                },
                y: { 
                    ticks: { color: colors.textColor },
                    grid: { color: colors.gridColor, drawBorder: false }
                }
            }
        }
    });
}