// ============================================================================
// DASHBOARD PRINCIPAL
// Responsabilidad: Cargar KPIs y listar los movimientos recientes.
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    startWebSocket()
    loadDashboardCards();
    loadRecentMovements();
});

function startWebSocket() {
    const socket = io()

    socket.on('movements_updated', loadDashboardCards)
    socket.on('movements_updated', loadRecentMovements)
    socket.on('new_movement', loadDashboardCards)
    socket.on('new_movement', loadRecentMovements)
}

// --- LÓGICA DE ACTUALIZACIÓN DESDE COMPONENTES ---
// Escuchamos si algún modal registró una operación exitosa para refrescar la vista
window.addEventListener('operationCompleted', () => {
    loadDashboardCards();
    loadRecentMovements();
});

// ============================================================================
// 1. CARGA DE KPIs (Tarjetas Superiores)
// ============================================================================
async function loadDashboardCards() {
    try {
        // KPI 1: Egresos del Mes
        const resEgresos = await fetch('/api/statistics/comparation-egresses');
        const dataEgresos = await resEgresos.json();

        if (dataEgresos.status === 'success') {
            const { total, variation, trend } = dataEgresos.data;
            document.getElementById('egresos-total').textContent = total;
            const trendElement = document.getElementById('egresos-trend');

            if (trend === 'subió') {
                trendElement.className = 'kpi-trend up';
                trendElement.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px; font-weight: bold;">north_east</span> ${variation}% vs mes anterior`;
            } else if (trend === 'bajó') {
                trendElement.className = 'kpi-trend down';
                trendElement.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px; font-weight: bold;">south_east</span> ${variation}% vs mes anterior`;
            } else {
                trendElement.className = 'kpi-trend';
                trendElement.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px;">remove</span> Sin variación`;
            }
        }

        // KPI 2: Stock en Alerta
        const resStock = await fetch('/api/stocks/low-stock/count');
        const dataStock = await resStock.json();

        if (dataStock.status === 'success') {
            const stockCount = dataStock.data;
            document.getElementById('stock-total').textContent = stockCount;
            const stockStatus = document.getElementById('stock-status');
            const stockIcon = document.getElementById('stock-icon');

            if (stockCount === 0) {
                stockStatus.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span> Todo en orden`;
                stockStatus.className = 'kpi-trend up';
                stockIcon.className = 'kpi-icon green';
            } else {
                stockStatus.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">warning</span> Requieren atención`;
                stockStatus.className = 'kpi-trend down';
                stockIcon.className = 'kpi-icon red-bg';
            }
        }

        // KPI 3: Envíos Pendientes
        const resEnvios = await fetch('/api/statistics/pending-shipments-count');
        const dataEnvios = await resEnvios.json();

        if (dataEnvios.status === 'success') {
            document.getElementById('envios-total').textContent = dataEnvios.data;
        }

    } catch (error) {
        console.error("Error cargando dashboard:", error);
    }
}

// ============================================================================
// 2. CARGA DE ÚLTIMOS MOVIMIENTOS (Tabla)
// ============================================================================
async function loadRecentMovements() {
    const tbody = document.getElementById('recent-movements-list');

    try {
        const response = await fetch('/api/movements/recent');
        const result = await response.json();

        if (result.status === 'success') {
            tbody.innerHTML = '';

            if (result.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #64748b;">No hay movimientos recientes.</td></tr>`;
                return;
            }

            result.data.forEach(mov => {
                let icon = 'help';
                if (mov.type.toLowerCase() === 'ingreso') icon = 'download';
                else if (mov.type.toLowerCase() === 'egreso') icon = 'upload';
                else if (mov.type.toLowerCase() === 'envio') icon = 'local_shipping';

                const dateObj = new Date(mov.date);
                const formattedDate = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

                const row = document.createElement('tr');
                row.className = 'movement-row';
                row.innerHTML = `
                    <td class="col-id">#${mov.id}</td>
                    <td class="col-nro">${mov.receipt_number}</td>
                    <td class="col-type"><span class="material-symbols-outlined icon-small">${icon}</span> ${mov.type}</td>
                    <td class="col-date">${formattedDate}</td>
                    <td class="col-status"><span class="badge ${mov.status.toLowerCase()}">${mov.status.replace('_', ' ')}</span></td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error("Error cargando movimientos:", error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1rem; color: #ef4444;">Error al cargar datos.</td></tr>`;
    }
}