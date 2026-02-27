let currentUsers = [];
let isEditing = false;
let searchTimeout;

document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    setupSearchDebounce();
    fetchBranches();
    fetchUsers();
});

// --- CARGA DE DATOS ---

async function fetchBranches() {
    try {
        const res = await fetch('/api/branches/catalog');
        const json = await res.json();
        if (json.status === 'success') {
            const selectBranch = document.getElementById('user-branch');
            json.data.forEach(b => {
                selectBranch.innerHTML += `<option value="${b.id}">${b.name}</option>`;
            });
        }
    } catch (e) { console.error('Error cargando sucursales:', e); }
}

async function fetchUsers() {
    const container = document.getElementById('users-list-container');
    container.innerHTML = `<div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;"><span class="material-symbols-outlined spin">refresh</span> Buscando usuarios...</div>`;

    const params = new URLSearchParams();
    const search = document.getElementById('user-search').value.trim();
    if (search) params.append('search', search);

    const active = document.getElementById('filter-status').value;
    if (active !== "") params.append('active', active);

    const role = document.getElementById('filter-role').value;
    if (role !== "") params.append('rol', role);

    try {
        const res = await fetch(`/api/users/?${params.toString()}`);
        const json = await res.json();

        if (Array.isArray(json)) {
            currentUsers = json;
            renderUsers(currentUsers);
        } else if (json.status === 'success' || json.message === 'success') {
            currentUsers = json.data;
            renderUsers(currentUsers);
        } else {
            console.error('Error backend:', json);
            throw new Error(json.message || 'Error al obtener usuarios');
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div style="grid-column: 1 / -1; color: red; text-align: center; padding: 2rem;">Error al cargar usuarios.</div>`;
    }
}

function renderUsers(users) {
    const container = document.getElementById('users-list-container');
    container.innerHTML = '';

    if (users.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: gray;">No se encontraron usuarios.</div>`;
        return;
    }

    users.forEach(user => {
        const isInactive = !user.is_active;
        const opacityClass = isInactive ? 'opacity: 0.6;' : '';
        const roleClass = user.is_admin ? 'role-admin' : 'role-vendedor';
        const roleName = user.is_admin ? 'ADMIN' : 'EMPLEADO';
        const initials = user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        const toggleIcon = isInactive ? 'person_add' : 'person_remove';
        const toggleTitle = isInactive ? 'Activar' : 'Desactivar';
        const toggleColor = isInactive ? 'color: #10b981; border-color: #10b981;' : '';

        const card = document.createElement('div');
        card.className = 'user-card';
        card.style = opacityClass;
        card.innerHTML = `
            <div class="card-header">
                <div class="user-profile-header">
                    <div class="user-avatar-circle">${initials}</div>
                    <div>
                        <h3 class="user-name-title">${user.full_name}</h3>
                        <span class="user-id">ID: ${user.id.substring(0, 8)}...</span>
                    </div>
                </div>
                <span class="role-badge ${roleClass}">${roleName}</span>
            </div>
            <div class="card-body">
                <div class="info-row">
                    <span class="material-symbols-outlined icon-info">store</span>
                    <p>${user.branch}</p>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn-action btn-key" title="Resetear Contraseña" onclick="abrirModalPassword('${user.id}', '${user.full_name}')">
                    <span class="material-symbols-outlined">lock_reset</span>
                </button>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-action btn-edit" title="Modificar Datos" onclick="editarUsuario('${user.id}')" ${isInactive ? 'disabled' : ''}>
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="btn-action btn-delete" style="${toggleColor}" title="${toggleTitle}" onclick="toggleStatusUsuario('${user.id}', '${user.full_name}')">
                        <span class="material-symbols-outlined">${toggleIcon}</span>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- MODAL: CREAR/EDITAR USUARIO ---

window.abrirModalNuevoUsuario = function () {
    isEditing = false;
    document.getElementById('modal-user-title').innerText = 'Nuevo Empleado';
    document.getElementById('btn-save-user-text').innerText = 'Crear Usuario';

    document.getElementById('group-initial-password').style.display = 'block';
    document.getElementById('group-confirm-password').style.display = 'block';
    document.getElementById('user-password').required = true;
    document.getElementById('user-confirm-password').required = true;

    document.getElementById('form-user').reset();
    document.getElementById('user-id').value = '';
    document.getElementById('create-password-error').style.display = 'none';

    document.getElementById('modal-user').classList.add('active');
}

window.editarUsuario = async function (id) {
    try {
        const res = await fetch(`/api/users/${id}`);
        const json = await res.json();

        let userData = null;
        if (json.status === 'success' || json.message === 'success') {
            userData = json.data;
        }

        if (userData) {
            isEditing = true;
            document.getElementById('modal-user-title').innerText = `Modificar a: ${userData.full_name}`;
            document.getElementById('btn-save-user-text').innerText = 'Guardar Cambios';

            document.getElementById('group-initial-password').style.display = 'none';
            document.getElementById('group-confirm-password').style.display = 'none';
            document.getElementById('user-password').required = false;
            document.getElementById('user-confirm-password').required = false;

            document.getElementById('user-id').value = userData.id;
            document.getElementById('user-name').value = userData.full_name;
            document.getElementById('user-email').value = userData.email || '';
            document.getElementById('user-branch').value = userData.branch_id || '';

            document.getElementById('modal-user').classList.add('active');
        } else {
            alert('No se pudo cargar la información del usuario.');
        }
    } catch (e) {
        console.error(e);
        alert('Error al intentar editar el usuario.');
    }
}

window.saveUser = async function () {
    const form = document.getElementById('form-user');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const payload = {
        full_name: document.getElementById('user-name').value,
        email: document.getElementById('user-email').value,
        branch_id: parseInt(document.getElementById('user-branch').value),
        is_admin: false,
        is_active: true
    };

    if (!isEditing) {
        const pass = document.getElementById('user-password').value;
        const confPass = document.getElementById('user-confirm-password').value;
        const errSpan = document.getElementById('create-password-error');

        if (pass !== confPass) {
            errSpan.style.display = 'block';
            return;
        }
        errSpan.style.display = 'none';
        payload.password = pass;
        payload.confirm_password = confPass;
    }

    const id = document.getElementById('user-id').value;
    const url = isEditing ? `/api/users/${id}` : '/api/users/';
    const method = isEditing ? 'PATCH' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const json = await res.json();

        if (res.ok || json.status === 'success') {
            alert(isEditing ? 'Datos actualizados.' : 'Usuario creado exitosamente.');
            document.getElementById('modal-user').classList.remove('active');
            fetchUsers(); // Esto refresca la lista automáticamente
        } else {
            console.error(json);
            alert('Error al guardar: Revisa los datos.');
        }
    } catch (err) { console.error(err); }
}

// --- MODAL: ESTADO Y CONTRASEÑA ---

window.toggleStatusUsuario = async function (id, name) {
    if (!confirm(`¿Cambiar estado de acceso de ${name}?`)) return;
    try {
        const res = await fetch(`/api/users/${id}/status`, { method: 'PATCH' });
        if (res.ok) fetchUsers();
    } catch (e) { console.error(e); }
}

window.abrirModalPassword = function (id, name) {
    document.getElementById('reset-user-id').value = id;
    document.getElementById('reset-user-name').textContent = name;
    document.getElementById('form-password').reset();
    document.getElementById('password-error').style.display = 'none';
    document.getElementById('modal-password').classList.add('active');
}

window.resetUserPassword = async function () {
    const form = document.getElementById('form-password');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('reset-user-id').value;
    const newPass = document.getElementById('new-password').value;
    const confPass = document.getElementById('confirm-password').value;
    const errSpan = document.getElementById('password-error');

    if (newPass !== confPass) {
        errSpan.style.display = 'block';
        return;
    }
    errSpan.style.display = 'none';

    if (!confirm('Se forzará a este usuario a cambiar su contraseña. ¿Continuar?')) return;

    try {
        const res = await fetch(`/api/users/reset-password/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPass, confirm_password: confPass })
        });

        if (res.ok) {
            alert('Contraseña reseteada con éxito.');
            document.getElementById('modal-password').classList.remove('active');
        } else {
            alert('Error al resetear la contraseña.');
        }
    } catch (e) { console.error(e); }
}

// --- UTILIDADES UI ---

function setupSearchDebounce() {
    const searchInput = document.getElementById('user-search');
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFilters();
        }, 500); // Espera 500ms después de dejar de escribir para buscar
    });
}

function applyFilters() {
    document.getElementById('filter-wrapper').classList.remove('active');
    fetchUsers();
}

function clearFilters() {
    document.getElementById('user-search').value = '';
    document.getElementById('filter-status').value = 'true';
    document.getElementById('filter-role').value = '';
    applyFilters();
}

function setupUI() {
    const filterBtn = document.getElementById('btn-filter-toggle');
    const filterWrapper = document.getElementById('filter-wrapper');
    const filterBtnClose = document.getElementById('btn-close-filter');

    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterWrapper.classList.toggle('active');
    });

    if (filterBtnClose) {
        filterBtnClose.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            filterWrapper.classList.remove('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (filterWrapper.classList.contains('active') && !e.target.closest('.filter-menu')) {
            filterWrapper.classList.remove('active');
        }
    });

    document.getElementById('btn-close-user').addEventListener('click', () => document.getElementById('modal-user').classList.remove('active'));
    document.getElementById('btn-cancel-user').addEventListener('click', () => document.getElementById('modal-user').classList.remove('active'));
    document.getElementById('btn-close-password').addEventListener('click', () => document.getElementById('modal-password').classList.remove('active'));
    document.getElementById('btn-cancel-password').addEventListener('click', () => document.getElementById('modal-password').classList.remove('active'));

    window.addEventListener('click', (e) => {
        const mUser = document.getElementById('modal-user');
        const mPass = document.getElementById('modal-password');
        if (e.target === mUser) mUser.classList.remove('active');
        if (e.target === mPass) mPass.classList.remove('active');
    });
}