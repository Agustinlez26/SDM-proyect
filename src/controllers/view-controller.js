export class ViewsController {

    renderLogIn(req, res) {

        res.render('pages/login', {
            title: 'Inicio de sesion - Sol de mayo',
            activePage: 'login',
            cssFile: 'login.css'
        })
    }

    renderFirstPass(req, res) {

        res.render('pages/first_password', {
            title: 'Primer ingreso - Sol de mayo',
            activePage: 'first-password',
            cssFile: 'login.css'
        })
    }

    renderDashboard(req, res) {
        res.render('pages/dashboard', {
            title: 'Dashboard General',
            activePage: 'dashboard',
            cssFile: 'dashboard.css',
            user: req.user
        })
    }

    renderProfile(req, res) {
        res.render('pages/my_profile', {
            title: 'Mi perfil',
            activePage: 'profile',
            cssFile: 'my-profile.css',
            user: req.user
        })
    }

    renderStock(req, res) {
        res.render('pages/stock', {
            title: 'Gestión de Stock',
            activePage: 'stock',
            cssFile: 'stock.css',
            user: req.user
        })
    }

    renderMovements(req, res) {
        res.render('pages/movements', {
            title: 'Movimientos',
            activePage: 'movements',
            cssFile: 'movements.css',
            user: req.user
        })
    }

    renderOperations(req, res) {
        res.render('pages/operations', {
            title: 'Operaciones',
            activePage: 'operations',
            cssFile: 'operations.css',
            user: req.user
        })
    }

    renderProducts(req, res) {
        res.render('pages/products', {
            title: 'Productos',
            activePage: 'products',
            cssFile: 'products.css',
            user: req.user
        })
    }

    renderStats(req, res) {
        res.render('pages/stats', {
            title: 'Estadisticas',
            activePage: 'stats',
            cssFile: 'stats.css',
            user: req.user
        })
    }

    renderBranches(req, res) {
        res.render('pages/branches', {
            title: 'Sucursales',
            activePage: 'branches',
            cssFile: 'branches.css',
            user: req.user
        })
    }

    renderUsers(req, res) {
        res.render('pages/users', {
            title: 'Usuarios',
            activePage: 'users',
            cssFile: 'users.css',
            user: req.user
        })
    }
}