let isEditing = false;
let currentBranches = [];

document.addEventListener('DOMContentLoaded', () => {
    startWebSocket()
    setupModalEvents();
    fetchProvinces();
    fetchBranchTypes();
    fetchBranches();
});

function startWebSocket() {
    const socket = io()

    socket.on('new_branch', () => {
        if (typeof fetchBranches === 'function') fetchCategories()
    })

    socket.on('branch_updated', () => {
        if (typeof fetchBranches === 'function') fetchCategories()
    })

    socket.on('branch_deleted', () => {
        if (typeof fetchBranches === 'function') fetchCategories()
    })

    socket.on('brach_activated', () => {
        if (typeof fetchBranches === 'function') fetchCategories()
    })
}


async function fetchBranches() {
    const container = document.getElementById('branches-list-container');
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem;"><span class="material-symbols-outlined spin">refresh</span> Cargando...</div>`;

    try {
        const res = await fetch('/api/branches/');
        const json = await res.json();

        if (json.status === 'success') {
            currentBranches = json.data;
            renderBranches(currentBranches);
        } else {
            throw new Error(json.message);
        }
    } catch (error) {
        console.error('Error cargando sucursales:', error);
        container.innerHTML = `<div style="grid-column: 1 / -1; color: red; text-align: center;">Error al cargar las sucursales.</div>`;
    }
}

async function fetchBranchTypes() {
    try {
        const res = await fetch('/api/branches/types');
        const json = await res.json();

        if (json.status === 'success') {
            const selectType = document.getElementById('branch-type');
            selectType.innerHTML = '<option value="" disabled selected>Seleccionar tipo...</option>';

            json.data.forEach(t => {
                selectType.innerHTML += `<option value="${t.id}">${t.name}</option>`;
            });
        }
    } catch (e) {
        console.error('Error cargando tipos de sucursal:', e);
    }
}

function renderBranches(branches) {
    const container = document.getElementById('branches-list-container');
    container.innerHTML = '';

    if (branches.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: gray;">No hay sucursales registradas.</div>`;
        return;
    }

    branches.forEach(branch => {
        const isActive = branch.is_active;
        const opacityStyle = isActive ? '1' : '0.6';
        const badgeHTML = isActive
            ? `<span class="badge status-ok">Activa</span>`
            : `<span class="badge status-danger">Inactiva</span>`;

        const actionButtons = isActive
            ? `
                <button class="btn-action btn-edit" title="Modificar" onclick="editarSucursal(${branch.id})">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="btn-action btn-delete" title="Desactivar/Eliminar" onclick="eliminarSucursal(${branch.id})">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            `
            : `
                <button class="btn-action" style="color: #10b981; border-color: #10b981;" title="Restaurar" onclick="activarSucursal(${branch.id})">
                    <span class="material-symbols-outlined">restore_from_trash</span>
                </button>
            `;

        const card = document.createElement('div');
        card.className = 'branch-card';
        card.style.opacity = opacityStyle;
        card.innerHTML = `
            <div class="card-header">
                <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <h3 class="branch-name">${branch.name}</h3>
                        ${badgeHTML}
                    </div>
                </div>
                <span class="branch-id">#${branch.id.toString().padStart(3, '0')}</span>
            </div>
            <div class="card-body">
                <div class="info-row">
                    <span class="material-symbols-outlined icon-info">location_on</span>
                    <div class="info-text">
                        <span class="info-label">Ubicación</span>
                        <p>${branch.address}</p>
                        <p style="font-size: 0.8rem; color: #64748b;">${branch.city}, ${branch.province}</p>
                    </div>
                </div>
                <div class="info-row">
                    <span class="material-symbols-outlined icon-info">store</span>
                    <div class="info-text">
                        <span class="info-label">Tipo</span>
                        <p><strong>${branch.type || 'Sucursal'}</strong></p>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                ${actionButtons}
            </div>
        `;
        container.appendChild(card);
    });
}

// ============================================================================
// 2. LÓGICA DE PROVINCIAS Y CIUDADES (Cascading Selects)
// ============================================================================
async function fetchProvinces() {
    try {
        const res = await fetch('/api/branches/provinces');
        const json = await res.json();

        if (json.status === 'success') {
            const selectProv = document.getElementById('branch-province');
            selectProv.innerHTML = '<option value="" disabled selected>Seleccionar provincia...</option>';

            json.data.forEach(p => {
                selectProv.innerHTML += `<option value="${p.id}">${p.name}</option>`;
            });
        }
    } catch (e) { console.error('Error cargando provincias:', e); }
}

async function fetchCitiesByProvince(provinceId, selectedCityId = null) {
    const citySelect = document.getElementById('branch-city');
    citySelect.innerHTML = '<option value="" disabled selected>Cargando ciudades...</option>';
    citySelect.disabled = true;

    try {
        // Asumo que tu API permite filtrar por provincia con un query param.
        // Si tu API simplemente devuelve TODAS las ciudades en /api/branches/cities, 
        // ver la nota debajo del bloque.
        const res = await fetch(`/api/branches/cities?province_id=${provinceId}`);
        const json = await res.json();

        if (json.status === 'success') {
            citySelect.innerHTML = '<option value="" disabled selected>Seleccionar ciudad...</option>';

            // Si el backend te devuelve el listado completo sin filtrar, filtramos acá en el JS:
            const filteredCities = json.data.filter(c => c.province_id == provinceId || !c.province_id);

            filteredCities.forEach(c => {
                citySelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });

            citySelect.disabled = false;

            // Si estábamos editando y teníamos una ciudad guardada, la pre-seleccionamos
            if (selectedCityId) {
                citySelect.value = selectedCityId;
            }
        }
    } catch (e) { console.error('Error cargando ciudades:', e); }
}

// ============================================================================
// 3. LÓGICA DEL MODAL Y FORMULARIO (Crear / Editar)
// ============================================================================
function setupModalEvents() {
    document.getElementById('btn-close-branch').addEventListener('click', cerrarModal);
    document.getElementById('btn-cancel-branch').addEventListener('click', cerrarModal);
    document.getElementById('btn-save-branch').addEventListener('click', saveBranch);

    // NUEVO: Escuchador para cuando el usuario cambia de Provincia
    document.getElementById('branch-province').addEventListener('change', (e) => {
        const provinceId = e.target.value;
        if (provinceId) {
            fetchCitiesByProvince(provinceId);
        }
    });
}

function cerrarModal() {
    document.getElementById('modal-branch').classList.remove('active');
}

window.abrirModalNuevaSucursal = function () {
    isEditing = false;
    document.getElementById('modal-branch-title').textContent = 'Nueva Sucursal';
    document.getElementById('btn-save-text').textContent = 'Crear Sucursal';

    document.getElementById('form-branch').reset();
    document.getElementById('branch-id').value = '';

    // Resetear el select de ciudades
    const citySelect = document.getElementById('branch-city');
    citySelect.innerHTML = '<option value="" disabled selected>Seleccionar provincia primero...</option>';
    citySelect.disabled = true;

    document.getElementById('modal-branch').classList.add('active');
}

window.editarSucursal = async function (id) {
    try {
        const res = await fetch(`/api/branches/${id}`);
        const json = await res.json();

        if (json.status === 'success') {
            const b = json.data;
            isEditing = true;
            document.getElementById('modal-branch-title').textContent = `Modificar Sucursal #${id.toString().padStart(3, '0')}`;
            document.getElementById('btn-save-text').textContent = 'Guardar Cambios';

            document.getElementById('branch-id').value = b.id;
            document.getElementById('branch-name').value = b.name;
            document.getElementById('branch-address').value = b.address;
            document.getElementById('branch-type').value = b.branch_type_id || "";

            // Lógica asíncrona para Provincia y Ciudad:
            const provSelect = document.getElementById('branch-province');
            provSelect.value = b.province_id || "";

            if (b.province_id) {
                // Hay que esperar a que las ciudades se carguen ANTES de setear el value de la ciudad
                await fetchCitiesByProvince(b.province_id, b.city_id);
            }

            document.getElementById('modal-branch').classList.add('active');
        }
    } catch (error) {
        console.error('Error obteniendo detalles:', error);
        alert('Error al cargar datos de la sucursal.');
    }
}

async function saveBranch() {
    const form = document.getElementById('form-branch');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const payload = {
        name: document.getElementById('branch-name').value,
        address: document.getElementById('branch-address').value,
        city_id: parseInt(document.getElementById('branch-city').value),
        province_id: parseInt(document.getElementById('branch-province').value),
        branch_type_id: parseInt(document.getElementById('branch-type').value),
        is_active: true
    };

    const id = document.getElementById('branch-id').value;
    const url = isEditing ? `/api/branches/${id}` : '/api/branches/';
    const method = isEditing ? 'PATCH' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const json = await res.json();

        if (json.status === 'success') {
            alert(isEditing ? 'Sucursal actualizada con éxito.' : 'Sucursal creada con éxito.');
            cerrarModal();
            fetchBranches();
        } else {
            console.error('Errores de validación:', json.error);
            alert('Error al guardar: ' + (json.message || 'Revisa los datos'));
        }
    } catch (error) {
        console.error('Error al guardar:', error);
        alert('Ocurrió un error en el servidor.');
    }
}

// ============================================================================
// 4. ELIMINAR Y RESTAURAR SUCURSALES
// ============================================================================
window.eliminarSucursal = async function (id) {
    if (!confirm('¿Estás seguro de que deseas desactivar/eliminar esta sucursal?')) return;
    try {
        const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.status === 'success') fetchBranches();
        else alert(json.message);
    } catch (e) { console.error(e); }
}

window.activarSucursal = async function (id) {
    if (!confirm('¿Deseas volver a activar esta sucursal?')) return;
    try {
        const res = await fetch(`/api/branches/active/${id}`, { method: 'PATCH' });
        const json = await res.json();
        if (json.status === 'success') fetchBranches();
        else alert(json.message);
    } catch (e) { console.error(e); }
}