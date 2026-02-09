export class ViewsController {
    
    renderDashboard(req, res) {
        const user = { name: 'Agustín', role: 'admin' } 

        res.render('pages/dashboard', {
            title: 'Dashboard General',
            activePage: 'dashboard',
            cssFile: 'dashboard.css',
            user: user
        })
    }

    renderStock(req, res) {
        const user = { name: 'Agustín', role: 'admin' }
        res.render('pages/dashboard', { 
            title: 'Gestión de Stock',
            activePage: 'stock', 
            cssFile: 'dashboard.css',
            user 
        })
    }

    renderProducts(req, res) {
        const user = { name: 'Agustín', role: 'admin' }
        res.render('pages/dashboard', { 
            title: 'Listado de Productos',
            activePage: 'products',
            cssFile: 'dashboard.css',
            user 
        })
    }

    renderMovements(req, res) {
        const user = { name: 'Agustín', role: 'admin' }
        res.render('pages/dashboard', { 
            title: 'Movimientos',
            activePage: 'movements',
            cssFile: 'dashboard.css',
            user 
        })
    }
    
    renderUsers(req, res) {
        const user = { name: 'Agustín', role: 'admin' }
        res.render('pages/dashboard', { 
            title: 'Usuarios',
            activePage: 'users',
            cssFile: 'dashboard.css',
            user 
        })
    }
}