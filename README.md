# Sol de Mayo - Sistema de Gestión de Stock y Sucursales

Sistema integral para la administración centralizada de inventario, control de sucursales y registro de movimientos (ingresos, egresos y envíos) diseñado para el proyecto "Sol de Mayo".

## Características Principales

- **Gestión de Usuarios y Roles:** Control de acceso basado en roles (Administrador y Empleado).
- **Control de Inventario:** ABM de productos, categorías y códigos de barra.
- **Multi-Sucursal:** Control de stock independiente y transferencias entre sucursales.
- **Registro de Operaciones:** Trazabilidad completa de Ingresos, Egresos y Envíos con cambio de estados.
- **Dashboard Estadístico:** Gráficos en tiempo real sobre rendimiento de sucursales, estacionalidad y productos más vendidos.
- **Interfaz Moderna:** Diseño responsive con soporte para Modo Claro/Oscuro.

## Stack Tecnológico

**Backend:**

- Node.js & Express.js
- Base de Datos: MySQL 2 (Arquitectura relacional)
- Validaciones: Zod
- Seguridad: Bcrypt (Hasheo de contraseñas) & JSON Web Tokens (JWT) / Cookies

**Frontend:**

- Motor de plantillas: EJS (Embedded JavaScript)
- CSS Custom (Variables nativas y Grid/Flexbox)
- Gráficos: Chart.js
- Iconografía: Google Material Symbols

## Instalación y Configuración Local

1. **Clonar el repositorio**
   ```bash
   git clone [TU_URL_DEL_REPOSITORIO]
   cd sol-de-mayo
   ```
