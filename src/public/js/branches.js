let isEditing = false;
let currentBranches = [];
const modalBranch = document.getElementById('modal-branch');

document.addEventListener('DOMContentLoaded', () => {
    initBranchesSocket();
    setupModalEvents();
    fetchProvinces();
    fetchBranchTypes();
    fetchBranches();
});

function initBranchesSocket() {
    const socket = io();

    socket.on('new_branch', fetchBranches);
    socket.on('branch_updated', fetchBranches);
    socket.on('branch_deleted', fetchBranches);
    socket.on('brach_activated', fetchBranches);
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
        // Quitamos el if (modalBranch.classList.contains('active'))
        const branchTypeData = await window.fetchWithCache('/api/branches/types', 'cache_branch_types', 120);

        if (branchTypeData && branchTypeData.status === 'success') {
            const selectType = document.getElementById('branch-type');
            if (selectType) {
                selectType.innerHTML = '<option value="" disabled selected>Seleccionar tipo...</option>';
                branchTypeData.data.forEach(t => {
                    selectType.innerHTML += `<option value="${t.id}">${t.name}</option>`;
                });
            }
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
                        <p style="font-size: 0.8rem; color: #64748b;">${branch.city || 'Ciudad'}, ${branch.province || 'Provincia'}</p>
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
        // Quitamos el if (modalBranch.classList.contains('active'))
        const provincesData = await window.fetchWithCache('/api/branches/provinces', 'cache_provinces', 120);

        if (provincesData && provincesData.status === 'success') {
            const selectProv = document.getElementById('branch-province');
            if (selectProv) {
                selectProv.innerHTML = '<option value="" disabled selected>Seleccionar provincia...</option>';
                provincesData.data.forEach(p => {
                    selectProv.innerHTML += `<option value="${p.id}">${p.name}</option>`;
                });
            }
        }
    } catch (e) { console.error('Error cargando provincias:', e); }
}

async function fetchCitiesByProvince(provinceId, selectedCityId = null) {
    const citySelect = document.getElementById('branch-city');
    if (!citySelect) return;

    citySelect.innerHTML = '<option value="" disabled selected>Cargando ciudades...</option>';
    citySelect.disabled = true;

    try {
        // Usamos cache, pero la clave incluye el provinceId para no mezclar ciudades
        const cacheKey = `cache_cities_prov_${provinceId}`;
        const citiesData = await window.fetchWithCache(`/api/branches/cities?province_id=${provinceId}`, cacheKey, 120);

        if (citiesData && citiesData.status === 'success') {
            citySelect.innerHTML = '<option value="" disabled selected>Seleccionar ciudad...</option>';

            // Tu backend debería filtrar, pero si no lo hace, filtramos acá
            const filteredCities = citiesData.data.filter(c => c.province_id == provinceId || !c.province_id);

            filteredCities.forEach(c => {
                citySelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });

            citySelect.disabled = false;

            if (selectedCityId) {
                citySelect.value = selectedCityId;
            }
        }
    } catch (e) {
        console.error('Error cargando ciudades:', e);
        citySelect.innerHTML = '<option value="" disabled>Error al cargar</option>';
    }
}

// ============================================================================
// 3. LÓGICA DEL MODAL Y FORMULARIO (Crear / Editar)
// ============================================================================
function setupModalEvents() {
    const btnClose = document.getElementById('btn-close-branch');
    const btnCancel = document.getElementById('btn-cancel-branch');
    const btnSave = document.getElementById('btn-save-branch');
    const selectProvince = document.getElementById('branch-province');

    if (btnClose) btnClose.addEventListener('click', cerrarModal);
    if (btnCancel) btnCancel.addEventListener('click', cerrarModal);
    if (btnSave) btnSave.addEventListener('click', saveBranch);

    // Corregido el Event Listener
    if (selectProvince) {
        selectProvince.addEventListener('change', (e) => {
            const provinceId = e.target.value;
            if (provinceId) {
                fetchCitiesByProvince(provinceId);
            } else {
                const citySelect = document.getElementById('branch-city');
                citySelect.innerHTML = '<option value="" disabled selected>Seleccionar provincia primero...</option>';
                citySelect.disabled = true;
            }
        });
    }
}

function cerrarModal() {
    if (modalBranch) modalBranch.classList.remove('active');
}

window.abrirModalNuevaSucursal = function () {
    isEditing = false;
    document.getElementById('modal-branch-title').textContent = 'Nueva Sucursal';
    document.getElementById('btn-save-text').textContent = 'Crear Sucursal';

    const form = document.getElementById('form-branch');
    if (form) form.reset();

    document.getElementById('branch-id').value = '';

    const citySelect = document.getElementById('branch-city');
    if (citySelect) {
        citySelect.innerHTML = '<option value="" disabled selected>Seleccionar provincia primero...</option>';
        citySelect.disabled = true;
    }

    if (modalBranch) modalBranch.classList.add('active');
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

            const typeSelect = document.getElementById('branch-type');
            if (typeSelect && b.branch_type_id) typeSelect.value = b.branch_type_id;

            const provSelect = document.getElementById('branch-province');
            if (provSelect && b.province_id) provSelect.value = b.province_id;

            if (b.province_id) {
                await fetchCitiesByProvince(b.province_id, b.city_id);
            }

            if (modalBranch) modalBranch.classList.add('active');
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
            // Limpiamos el caché general de sucursales tras guardar
            sessionStorage.removeItem('cache_branches');
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
        if (json.status === 'success') {
            sessionStorage.removeItem('cache_branches');
            fetchBranches();
        }
        else alert(json.message);
    } catch (e) { console.error(e); }
}

window.activarSucursal = async function (id) {
    if (!confirm('¿Deseas volver a activar esta sucursal?')) return;
    try {
        const res = await fetch(`/api/branches/active/${id}`, { method: 'PATCH' });
        const json = await res.json();
        if (json.status === 'success') {
            sessionStorage.removeItem('cache_branches');
            fetchBranches();
        }
        else alert(json.message);
    } catch (e) { console.error(e); }
}
