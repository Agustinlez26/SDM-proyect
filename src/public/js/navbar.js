document.addEventListener('DOMContentLoaded', () => {
    initNavbarSocket();
    setupDropdowns();
    setupThemeToggle();
    fetchNotifications();
    setupLogout()
});

function initNavbarSocket() {
    const socket = io()

    const handleNofifications = () => {
        sessionStorage.removeItem('cache_notifications')
        fetchNotifications(true)
    }

    socket.on('movements_updated', handleNofifications)
    socket.on('new_movement', handleNofifications)
}


// --- DROPDOWNS Y CERRADO FUERA DEL MENÚ ---
function setupDropdowns() {
    const notifBtn = document.getElementById('btn-notifications');
    const notifWrapper = document.getElementById('notif-wrapper');
    const userBtn = document.getElementById('btn-user-menu');
    const userWrapper = document.getElementById('user-wrapper');

    // Toggle Notificaciones
    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userWrapper.classList.remove('active'); // Cierra el otro
        notifWrapper.classList.toggle('active');
        if (notifWrapper.classList.contains('active')) {
            // Cuando abre, si el badge tenía números, simulamos que "las vio" y lo ocultamos (opcional)
            // document.getElementById('notif-badge').classList.add('hidden');
        }
    });

    // Toggle Usuario
    userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifWrapper.classList.remove('active'); // Cierra el otro
        userWrapper.classList.toggle('active');
    });

    // Cerrar al clickear afuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown-wrapper')) {
            notifWrapper.classList.remove('active');
            userWrapper.classList.remove('active');
        }
    });
}

// --- TEMA CLARO / OSCURO ---
function setupThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    const iconMoon = document.getElementById('icon-moon');
    const iconSun = document.getElementById('icon-sun');
    const themeText = document.getElementById('theme-text');

    // Checkear si hay un tema guardado
    const currentTheme = localStorage.getItem('theme') || 'light';

    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
        iconMoon.classList.add('hidden');
        iconSun.classList.remove('hidden');
        themeText.textContent = 'Modo Claro';
    }

    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Evita que se cierre el menú de usuario

        document.body.classList.toggle('dark-theme');
        let theme = 'light';

        if (document.body.classList.contains('dark-theme')) {
            theme = 'dark';
            iconMoon.classList.add('hidden');
            iconSun.classList.remove('hidden');
            themeText.textContent = 'Modo Claro';
        } else {
            iconMoon.classList.remove('hidden');
            iconSun.classList.add('hidden');
            themeText.textContent = 'Modo Oscuro';
        }

        localStorage.setItem('theme', theme);
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById('btn-logout');

    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                window.location.href = '/login';
                sessionStorage.clear()
            } else {
                alert('No se pudo cerrar la sesión. Intenta nuevamente.');
            }
        } catch (error) {
            console.error('Error cerrando sesión:', error);
            alert('Error de conexión al intentar cerrar sesión.');
        }
    });
}

async function fetchNotifications(forceRefresh = false) {
    const notifList = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');

    try {

        const json = await window.fetchWithCache(`/api/notifications`, 'cache_notifications', 5, forceRefresh);

        if (json.status !== 'success' || !json.data || json.data.length === 0) {
            badge.classList.add('hidden');
            notifList.innerHTML = `<div class="notif-empty">¡Todo al día! No hay notificaciones nuevas.</div>`;
            return;
        }

        const notifications = json.data;
        badge.textContent = notifications.length;
        badge.classList.remove('hidden');

        let notifHTML = notifications.map(notif => {
            const { type, icon, title, message, date, movementId } = notif;
            const bgClass = getBgClass(type);
            const formattedDate = date ? formatDate(date) : '';

            return `
                <div class="notif-item notif-${type}" data-movement-id="${movementId || ''}" data-type="${type}" style="cursor: pointer;">
                    <div class="notif-icon ${bgClass}">
                        <span class="material-symbols-outlined">${icon}</span>
                    </div>
                    <div class="notif-content">
                        <p class="notif-title"><strong>${title}</strong></p>
                        <p class="notif-message">${message}</p>
                        ${formattedDate ? `<span class="notif-time">${formattedDate}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        notifList.innerHTML = notifHTML;

        // Navegación inteligente al hacer click en una notificación
        document.querySelectorAll('.notif-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.getAttribute('data-type');
                const movementId = item.getAttribute('data-movement-id');

                switch (type) {
                    case 'danger':
                        window.location.href = '/stock?filter=out_stock';
                        break;
                    case 'warning':
                        window.location.href = '/stock?filter=low_stock';
                        break;
                    case 'info':
                        window.location.href = movementId
                            ? `/operations?id=${movementId}`
                            : '/operations';
                        break;
                    case 'success':
                        window.location.href = movementId
                            ? `/movements?id=${movementId}`
                            : '/movements';
                        break;
                    default:
                        break;
                }
            });
        });

    } catch (error) {
        console.error('Error cargando notificaciones:', error);
        notifList.innerHTML = `<div class="notif-empty" style="color:red;">Error cargando notificaciones.</div>`;
        badge.classList.add('hidden');
    }
}

/**
 * Mapea el tipo de notificación a la clase CSS de fondo
 */
function getBgClass(type) {
    const typeMap = {
        'danger': 'bg-danger',
        'warning': 'bg-warning',
        'info': 'bg-info',
        'success': 'bg-success'
    };
    return typeMap[type] || 'bg-info';
}

/**
 * Formatea la fecha a un formato legible
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Justo ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;

    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}
