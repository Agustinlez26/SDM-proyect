export class ViewsController {

    renderLogIn(req, res) {

        res.render('pages/login', {
            title: 'Inicio de sesion - Sol de mayo',
            activePage: 'login',
            cssFile: 'login.css'
        })
    }

    renderFirstPass(req, res) {

        res.render('pages/first-password', {
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
        res.render('pages/my-profile', {
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

    renderWholesaleOrders(req,res){ if(req.user.app_role==='seller'&&req.user.area!=='wholesale') return res.status(403).send('Sin acceso a Mayorista'); res.render('pages/orders',{title:'Mayorista',activePage:'wholesale',cssFile:'orders.css',user:req.user,orderChannel:'mayorista',orderTitle:'Pedidos mayoristas'}) }
    renderMercadoLibre(req,res){ if(req.user.app_role==='seller'&&req.user.area!=='retail') return res.status(403).send('Sin acceso a Mercado Libre'); res.render('pages/orders',{title:'Mercado Libre',activePage:'mercado-libre',cssFile:'orders.css',user:req.user,orderChannel:'mercado_libre',orderTitle:'Pedidos de Mercado Libre'}) }
    renderTiendaNube(req,res){ if(req.user.app_role==='seller'&&req.user.area!=='retail') return res.status(403).send('Sin acceso a Tienda Nube'); res.render('pages/orders',{title:'Tienda Nube',activePage:'tienda-nube',cssFile:'orders.css',user:req.user,orderChannel:'tienda_nube',orderTitle:'Pedidos de Tienda Nube'}) }
    renderShowroomSales(req,res){ if(req.user.app_role==='seller'&&req.user.area!=='retail') return res.status(403).send('Sin acceso a Ventas Showroom'); res.render('pages/orders',{title:'Ventas Showroom',activePage:'showroom-sales',cssFile:'orders.css',user:req.user,orderChannel:'showroom',orderTitle:'Ventas Showroom'}) }
    renderMerchandisingSales(req,res){ if(req.user.app_role==='seller'&&req.user.area!=='merchandising') return res.status(403).send('Sin acceso a Merchandising'); res.render('pages/orders',{title:'Merchandising',activePage:'merchandising',cssFile:'orders.css',user:req.user,orderChannel:'merchandising',orderTitle:'Pedidos de Merchandising'}) }

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
