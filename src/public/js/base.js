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