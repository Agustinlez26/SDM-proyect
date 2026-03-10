document.addEventListener('DOMContentLoaded', () => {
    fetchMyProfile();
    setupModalListeners();
});

// --- 1. DATOS DEL PERFIL ---

async function fetchMyProfile() {
    try {
        const res = await fetch('/api/users/me');
        const json = await res.json();

        if (res.ok || json.status === 'success') {
            const user = json.data || json;

            // Función auxiliar inteligente para evitar errores "null"
            const setElementData = (id, value) => {
                const el = document.getElementById(id);
                if (el) {
                    // Si es un input le pone .value, sino le pone .textContent
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        el.value = value;
                    } else {
                        el.textContent = value;
                    }
                } else {
                    console.warn(`⚠️ ATENCIÓN: Falta el elemento HTML con id="${id}"`);
                }
            };

            // Llenamos la vista usando la función segura
            setElementData('profile-name', user.full_name);
            setElementData('profile-role', user.email);

            setElementData('input-name', user.full_name);
            setElementData('input-email', user.email);
            setElementData('input-branch', user.branch || 'Sin sucursal asignada');

            // Llenamos el modal oculto
            setElementData('edit-user-id', user.id);
            setElementData('edit-full-name', user.full_name);
            setElementData('edit-email', user.email);

            // Crear Avatar con Iniciales (este usa innerHTML, lo hacemos a mano)
            const avatarEl = document.getElementById('profile-avatar');
            if (avatarEl) {
                const initials = user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                avatarEl.innerHTML = `<span>${initials}</span>`;
            }

        } else {
            alert('No se pudieron cargar los datos del perfil.');
        }
    } catch (error) {
        console.error('Error de red:', error);
    }
}

// --- 2. LÓGICA DE MODALES ---

function setupModalListeners() {
    // Escuchadores Modal Contraseña
    const modalPwd = document.getElementById('modal-change-password');
    document.getElementById('btn-close-pwd').addEventListener('click', () => closeModalPwd());
    document.getElementById('btn-cancel-pwd').addEventListener('click', () => closeModalPwd());

    modalPwd.addEventListener('click', (e) => {
        if (e.target === modalPwd) closeModalPwd();
    });
    document.getElementById('form-change-password').addEventListener('submit', handleChangePassword);

    // Escuchadores Modal Edición Perfil
    const modalEdit = document.getElementById('modal-edit-profile');
    document.getElementById('form-edit-profile').addEventListener('submit', handleEditProfile);

    modalEdit.addEventListener('click', (e) => {
        if (e.target === modalEdit) closeEditProfileModal();
    });
}

// Control Modal Contraseña
window.openPasswordModal = function () {
    document.getElementById('form-change-password').reset();
    document.getElementById('pwd-error-msg').style.display = 'none';
    document.getElementById('modal-change-password').classList.add('active');
}
function closeModalPwd() {
    document.getElementById('modal-change-password').classList.remove('active');
}

window.openEditProfileModal = function () {
    // Tomamos los valores que ya están en los inputs "readonly" de la vista principal
    const currentName = document.getElementById('input-name').value;
    const currentEmail = document.getElementById('input-email').value;

    // Y los pasamos al formulario del modal antes de abrirlo
    document.getElementById('edit-full-name').value = currentName;
    document.getElementById('edit-email').value = currentEmail;

    // Abrimos el modal
    document.getElementById('modal-edit-profile').classList.add('active');
}

window.closeEditProfileModal = function () {
    document.getElementById('modal-edit-profile').classList.remove('active');
}

// --- 3. ENVÍOS (SUBMITS) ---

async function handleChangePassword(e) {
    e.preventDefault();

    const oldPwd = document.getElementById('pwd-old').value;
    const newPwd = document.getElementById('pwd-new').value;
    const confirmPwd = document.getElementById('pwd-confirm').value;
    const errorMsg = document.getElementById('pwd-error-msg');

    if (newPwd !== confirmPwd) {
        errorMsg.style.display = 'block';
        return;
    }
    errorMsg.style.display = 'none';

    const payload = {
        old_password: oldPwd,
        password: newPwd,
        confirm_password: confirmPwd
    };

    const btnSubmit = document.getElementById('btn-submit-pwd');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';

    try {
        const res = await fetch('/api/users/change-password', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const json = await res.json();

        if (res.ok || json.status === 'success') {
            alert('¡Contraseña actualizada con éxito! Deberás usarla en tu próximo inicio de sesión.');
            closeModalPwd();
        } else {
            alert('Error: ' + (json.message || 'Verifica que tu contraseña actual sea correcta.'));
        }
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        alert('Ocurrió un error de conexión.');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Guardar Cambios';
    }
}

async function handleEditProfile(e) {
    e.preventDefault();

    const id = document.getElementById('edit-user-id').value;
    const fullName = document.getElementById('edit-full-name').value;
    const email = document.getElementById('edit-email').value;

    const payload = { full_name: fullName, email: email };
    const btnSubmit = document.getElementById('btn-submit-profile');

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';

    try {
        const res = await fetch(`/api/users/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const json = await res.json();

        if (res.ok || json.status === 'success') {
            alert('¡Perfil actualizado con éxito!');
            closeEditProfileModal();
            fetchMyProfile(); // Recargamos para ver los cambios
        } else {
            alert('Error al guardar: ' + (json.message || 'Verifica los datos.'));
        }
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        alert('Ocurrió un error de conexión.');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Guardar Cambios';
    }
}
