// ============================================================================
// VISTA: OPERACIONES
// Responsabilidad: Buzón de alertas de envíos y confirmación/despacho.
// ============================================================================

let currentShipmentType = null;
let currentShipmentId = null;

document.addEventListener('DOMContentLoaded', () => {
    startWebSocket()
    loadPendingShipments();
});

function startWebSocket() {
    const socket = io()

    socket.on('movements_updated', loadPendingShipments)
    socket.on('new_movement', loadPendingShipments)
}

// Refrescar si se crea un envío desde el otro componente
window.addEventListener('operationCompleted', () => {
    loadPendingShipments();
});

// --- CARGA DE ALERTAS ---
async function loadPendingShipments() {
    const container = document.getElementById('alerts-grid-container');
    const alertTitle = document.getElementById('alert-title');
    const alertIcon = document.getElementById('alert-icon');
    if (!container) return;

    try {
        const res = await fetch('/api/movements/shipments');
        const json = await res.json();

        // MANEJO DE ERROR DEL BACKEND (Ej: "El id ingresado es invalido")
        if (json.status === 'error') {
            alertTitle.textContent = 'Aviso del Sistema';
            alertIcon.textContent = 'error';
            alertIcon.style.color = '#ef4444';
            container.innerHTML = `
                <div style="padding: 1.5rem; border: 1px solid #fca5a5; border-radius: 8px; background: #fef2f2; color: #b91c1c;">
                    <strong>Error del servidor:</strong> ${json.message}
                </div>`;
            return;
        }

        if (json.status === 'success') {
            const shipments = json.data;

            console.log("Datos del envío para el empleado:", shipments);

            if (shipments.length === 0) {
                alertTitle.textContent = 'Todo al día';
                alertIcon.textContent = 'check_circle';
                alertIcon.style.color = '#10b981';
                container.innerHTML = '<div style="padding: 1.5rem; color: #64748b; font-size: 0.95rem;">No hay envíos pendientes en este momento.</div>';
                return;
            }

            alertTitle.textContent = 'Requiere tu atención';
            alertIcon.textContent = 'notifications_active';
            alertIcon.style.color = '#ef4444';
            container.innerHTML = '';

            shipments.forEach(shipment => {
                const dateObj = new Date(shipment.date);
                const dateStr = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

                // Normalizamos el estado para la lógica
                const statusNormal = (shipment.status || '').toLowerCase();

                let actionButton = '';

                // LÓGICA DE ADMIN
                if (window.USER_ROLE === 'admin') {
                    if (statusNormal === 'pendiente') {
                        actionButton = `
                            <button class="btn-primary" onclick="openShipmentModal('dispatch', ${shipment.id}, '${shipment.receipt_number || shipment.id}')">
                                Verificar y Despachar
                            </button>
                        `;
                    } else {
                        actionButton = `
                            <button class="btn-secondary" disabled style="opacity: 0.7; cursor: not-allowed; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">local_shipping</span>
                                Envío en Camino
                            </button>
                        `;
                    }
                }
                // LÓGICA DE EMPLEADO
                else {
                    if (statusNormal === 'pendiente') {
                        // El empleado ve que se está preparando, pero no puede clickear
                        actionButton = `
                            <button class="btn-secondary" disabled style="opacity: 0.6; cursor: not-allowed; justify-content: center; background: var(--bg-input);">
                                <span class="material-symbols-outlined" style="font-size: 18px;">hourglass_empty</span>
                                Esperando despacho...
                            </button>
                        `;
                    } else if (statusNormal === 'en_proceso' || statusNormal === 'en proceso') {
                        // El envío ya fue despachado, el empleado puede confirmar la llegada
                        actionButton = `
                            <button class="btn-success" style="width: 100%; justify-content: center;" onclick="openShipmentModal('receive', ${shipment.id}, '${shipment.receipt_number || shipment.id}')">
                                <span class="material-symbols-outlined" style="font-size: 18px;">inventory_2</span>
                                Confirmar Llegada
                            </button>
                        `;
                    }
                }

                const card = document.createElement('div');
                card.className = 'alert-card';
                card.innerHTML = `
                    <div class="alert-info">
                        <span class="badge ${statusNormal}">${(shipment.status || 'Pendiente').replace('_', ' ')}</span>
                        <h3>Envío ${shipment.receipt_number || '#' + shipment.id}</h3>
                        <p>Desde/Hacia: <strong>${shipment.branch || shipment.origin_branch_name || 'Desconocido'}</strong></p>
                        <p class="alert-date">Fecha: ${dateStr}</p>
                    </div>
                    ${actionButton}
                `;
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error("Error cargando alertas:", error);
        container.innerHTML = '<p style="color: #ef4444; padding: 1.5rem;">Error de conexión al cargar las alertas.</p>';
    }
}

// --- MODAL DE ENVÍOS (AESTHETIC) ---
window.openShipmentModal = function (type, refId, receipt) {
    currentShipmentType = type;
    currentShipmentId = refId;

    const modal = document.getElementById('modal-shipment');
    const header = document.getElementById('modal-shipment-header');
    const title = document.getElementById('modal-shipment-title');
    const subtitle = document.getElementById('modal-shipment-subtitle');
    const iconHeader = document.getElementById('modal-shipment-icon');

    const btnIcon = document.getElementById('btn-confirm-shipment-icon');
    const btnText = document.getElementById('btn-confirm-shipment-text');
    const btnConfirm = document.getElementById('btn-confirm-shipment');

    if (type === 'dispatch') {
        // Estilo Azul para Admin (Despacho)
        header.style.backgroundColor = '#eff6ff';
        header.style.borderBottomColor = '#bfdbfe';
        iconHeader.textContent = 'local_shipping';
        iconHeader.style.color = '#3b82f6';
        iconHeader.style.backgroundColor = '#dbeafe';

        title.textContent = `Despachar Envío ${receipt}`;
        subtitle.textContent = 'Revisa cuidadosamente los productos antes de enviarlos a la sucursal.';

        btnIcon.textContent = 'local_shipping';
        btnText.textContent = 'Marcar En Camino';
        btnConfirm.className = 'btn-primary';
    } else if (type === 'receive') {
        // Estilo Verde para Empleado (Recepción)
        header.style.backgroundColor = '#f0fdf4';
        header.style.borderBottomColor = '#bbf7d0';
        iconHeader.textContent = 'inventory_2';
        iconHeader.style.color = '#15803d';
        iconHeader.style.backgroundColor = '#dcfce7';

        title.textContent = `Recibir Envío ${receipt}`;
        subtitle.textContent = 'Verifica que hayas recibido todos los productos de esta lista.';

        btnIcon.textContent = 'done_all';
        btnText.textContent = 'Confirmar Llegada';
        btnConfirm.className = 'btn-success';
    }

    loadShipmentDetails(refId);
    modal.classList.add('active');
}

async function loadShipmentDetails(refId) {
    const prodList = document.getElementById('shipment-products-list');
    prodList.innerHTML = '<tr><td colspan="3" class="text-center" style="padding: 3rem;"><span class="material-symbols-outlined spin" style="font-size: 32px; color: var(--primary);">refresh</span><br><span style="color: var(--text-muted); margin-top: 10px; display: inline-block;">Cargando detalles...</span></td></tr>';

    try {
        const res = await fetch(`/api/movements/${refId}/details`);
        const json = await res.json();
        if (json.status === 'success') {
            renderShipmentProducts(json.data);
        } else {
            throw new Error('Error en json');
        }
    } catch (e) {
        console.error(e);
        prodList.innerHTML = '<tr><td colspan="3" class="text-center" style="color:red; padding: 2rem;">No se pudieron cargar los detalles del envío.</td></tr>';
    }
}

function renderShipmentProducts(products) {
    const prodList = document.getElementById('shipment-products-list');
    prodList.innerHTML = '';

    if (!products || products.length === 0) {
        prodList.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding: 2rem;">El envío está vacío.</td></tr>';
        return;
    }

    products.forEach(p => {
        prodList.innerHTML += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td class="font-mono text-muted" style="padding: 1rem;">${p.barcode || 'S/C'}</td>
                <td class="font-bold" style="padding: 1rem; color: var(--text-primary); font-size: 0.95rem;">${p.product_name}</td>
                <td class="text-center" style="padding: 1rem;">
                    <span style="background: var(--primary-light); color: var(--primary); padding: 6px 16px; border-radius: 20px; font-weight: 800; font-size: 1rem;">${p.quantity}</span>
                </td>
            </tr>
        `;
    });
}

// --- SUBMIT: CAMBIAR ESTADO DE ENVÍO ---
document.getElementById('btn-confirm-shipment').addEventListener('click', async () => {
    const accion = currentShipmentType === 'receive' ? 'llegada (Entregado)' : 'salida (En Proceso)';
    if (!confirm(`¿Confirmar la ${accion} de este envío?`)) return;

    const btn = document.getElementById('btn-confirm-shipment');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spin">refresh</span> Procesando...';

    try {
        const res = await fetch(`/api/movements/changeStatus/${currentShipmentId}`, { method: 'PATCH' });
        const data = await res.json();

        if (res.ok || data.status === 'success') {
            alert('¡Estado del envío actualizado correctamente!');
            document.getElementById('modal-shipment').classList.remove('active');
            loadPendingShipments();
            window.dispatchEvent(new CustomEvent('operationCompleted'));
        } else {
            alert('Error: ' + data.message);
        }
    } catch (e) {
        console.error(e);
        alert('Ocurrió un error de conexión');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
});

// Cerrar tocando afuera
document.getElementById('modal-shipment').addEventListener('click', (e) => {
    if (e.target.id === 'modal-shipment') e.target.classList.remove('active');
});