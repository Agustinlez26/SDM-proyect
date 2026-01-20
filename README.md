# Sol de Mayo (SDM) - Sistema de Gestión de Stock

Plataforma integral para el control de inventario de productos, gestión de movimientos comerciales, sucursales y control de acciones por empleados, diseñada para optimizar la trazabilidad de productos en tiempo real

tecnologias necesarias:
Front-end: HTML, CSS, JavaScript.

Back-end: 
-PHP: 8.3.16,
-MySQL: 8.4.3,
-Apache: 2.4.62.

dependencias:
-Composer: 6.11.1,
-Respect:
-Validation:
-phpdontenv

Arquitectura: basado en el patron de arquitectura MVC (Modelo-Vista-Controlador)
junto con capaz como service(Logica de negocio), DTOs(transferencia integral de los datos), DAOs(acceso a las entidades de la BD)
    /Sol-de-mayo
    ├── /src
    │   ├── /Controllers
    │   ├── /Services
    │   ├── /Models
    │   ├── /DTOs
    │   ├── /DAOs
    │   ├── /Middlewares
    │   └── /Validations
    │   └── /Views
    ├── /public
    │   └── index.php
    ├── /routes
    ├── /vendor
    ├── /config
    └── composer.json

