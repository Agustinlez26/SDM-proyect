document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const layout = document.querySelector('.layout');


    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            layout.classList.toggle('sidebar-open');
        });
    }

    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        if (layout.classList.contains('sidebar-open') && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
            layout.classList.remove('sidebar-open');
        }
    });
});

window.fetchWithCache = async function (url, cacheKey, ttlMinutes = 60, forceRefresh = false) {
    if (!forceRefresh) {
        const cachedData = sessionStorage.getItem(cacheKey);
        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            if (Date.now() < parsed.expiry) {

                return parsed.data;
            }
        }
    }


    const res = await fetch(url);

    if (res.status === 401) {
        alert('Tu sesión ha expirado o iniciaste sesión en otro dispositivo.');
        window.location.href = '/login';
        return { status: 'error', data: [] };
    }

    const json = await res.json();

    if (json.status === 'success') {
        sessionStorage.setItem(cacheKey, JSON.stringify({
            data: json,
            expiry: Date.now() + (ttlMinutes * 60 * 1000)
        }));
    }

    return json;
}
