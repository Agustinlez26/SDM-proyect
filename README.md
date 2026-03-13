# Sol de Mayo - Sistema de Gestión de Stock y Sucursales

<div align="center">
  <h3>Sistema centralizado para la administración de inventario y logística inter-sucursal.</h3>
</div>

---

## Índice

- [Acerca del Proyecto](#-acerca-del-proyecto)
- [Módulos Principales](#-módulos-principales)
- [Arquitectura (MVC Extendido)](#-arquitectura-mvc-extendido)
- [Stack Tecnológico](#-stack-tecnológico)
- [Seguridad y Rendimiento](#-seguridad-y-rendimiento)
- [Instalación y Uso Local](#-instalación-y-uso-local)

---

## Acerca del Proyecto

**Sol de Mayo** es un sistema web de gestión operativa (ERP a medida) desarrollado específicamente para administrar el flujo de mercadería de una empresa con múltiples depósitos y puntos de venta. 

Su función principal es centralizar el control del inventario y registrar todos los movimientos internos de la organización. A través de un control de acceso basado en roles (RBAC), permite a los administradores y empleados de cada local registrar ingresos, egresos y transferencias físicas de artículos entre distintas ubicaciones.

El sistema aplica validaciones geográficas en los movimientos inter-sucursal y utiliza sincronización de eventos en tiempo real para asegurar la trazabilidad de cada transacción, manteniendo la consistencia de la base de datos ante operaciones simultáneas.

---

## Módulos Principales

1. **Gestión de Stock:**
   * Visualización de inventario mediante grillas dinámicas filtrables por sucursal.
   * Paginación procesada del lado del servidor (*Server-Side Pagination*) para la gestión eficiente de datos.
   * Exportación de lotes y alertas de límites mínimos (Stock Crítico) o Agotamientos (Stock Cero).

2. **Registro de Movimientos (Logística):**
   * Trazabilidad del ciclo de vida de las transacciones: Ingresos, Egresos y Envíos inter-sucursal.
   * Lógica transaccional cruzada: Los envíos permanecen en estado "En Proceso", bloqueando lógicamente las unidades en tránsito hasta que la sucursal receptora confirma la recepción.

3. **Gestión de Productos y Sucursales:**
   * Módulo de ABM (Alta, Baja y Modificación) para el catálogo de artículos y la red de locales.
   * Implementación de validación espacial jerárquica (Ciudad/Provincia) mediante *Cascading Dropdowns*.

4. **Dashboard y Business Intelligence (BI):**
   * Alertas automatizadas del estado de la logística (ej: detección de envíos pendientes de recepción por más de 48 horas).
   * Historiales de desempeño interanual y cálculo de variaciones porcentuales de flujo de mercadería.

5. **Control de Accesos y Usuarios:**
   * Administración de perfiles de empleados con asignación de privilegios binarios (Administrador / Empleado).
   * Gestión de sesiones y seguridad: expiración de tokens, bloqueo de accesos anómalos y reseteo obligatorio de credenciales en el primer ingreso.

---

## Arquitectura (MVC Extendido)

El sistema utiliza el patrón MVC tradicional, implementando una arquitectura de responsabilidades separadas en cuatro capas:

* **Rutas (`/routes`):** Encargadas de definir los endpoints, asignar middlewares de seguridad y derivar la petición.
* **Controladores (`/src/controllers`):** Gestionan la petición HTTP. Extraen los datos (`req`), aplican validaciones de esquema mediante *Zod* y estructuran la respuesta (`res`).
* **Servicios (`/src/services`):** Encapsulan la lógica de negocio. Son agnósticos al protocolo HTTP, encargándose de los cálculos y validaciones de transacciones.
* **Modelos (`/src/models`):** Capa dedicada a la persistencia de datos. Ejecutan consultas SQL parametrizadas, orquestando transacciones (`START TRANSACTION` / `COMMIT`) mediante la librería `mysql2/promises`.

---

## Stack Tecnológico

**Backend & Core:**
* **Node.js**: Entorno de ejecución asíncrono.
* **Express.js**: Framework web para la gestión de enrutamiento y middlewares.
* **Socket.io**: WebSockets para comunicación bidireccional en tiempo real.
* **Zod**: Validación declarativa de esquemas y payloads.

**Infraestructura & Base de Datos:**
* **MySQL 2**: Sistema de gestión de base de datos relacional. Utiliza `UUID_TO_BIN` para la indexación y claves foráneas para la integridad referencial.

**Frontend & Interfaz de Usuario:**
* **EJS (Embedded JavaScript)**: Motor de plantillas para *Server-Side Rendering* (SSR).
* **Vanilla JS y CSS Modular**: Arquitectura frontend *Zero-Dependencies* con soporte nativo para *Dark/Light Mode*.
* **Chart.js**: Biblioteca gráfica para la visualización de datos estadísticos.

---

## Seguridad y Rendimiento

El backend de Sol de Mayo incluye las siguientes medidas de seguridad y rendimiento:

* **Rate Limiting:** Middlewares configurados vía `express-rate-limit` que controlan el volumen de peticiones por IP (validando la IP mediante `trust proxy`).
* **Gestión de Sesiones (JWT + Cookies):** Autenticación mediante JSON Web Tokens encapsulados en cookies `HttpOnly` para evitar accesos XSS, con invalidación en base de datos para revocar sesiones.
* **Cabeceras HTTP Seguras (Helmet):** Integración de Content-Security-Policy (CSP) para prevenir la inyección de scripts cruzados (XSS).
* **Almacenamiento Criptográfico (Bcrypt):** Hashing de contraseñas con *salting* automático.
* **Prevención de Mass-Assignment:** Mapeadores que filtran explícitamente los payloads recibidos antes de interactuar con la base de datos para prevenir inyección de propiedades.

---

## Instalación y Uso Local

1. **Clonar Repositorio:**
   ```bash
   git clone https://github.com/Agustinlez26/SDM-proyect
   cd sol-de-mayo

2. **Instalar Dependencias:**
   ```bash
   npm install
   ```

3. **Configurar el Entorno:**
   - Crear archivo `.env` en la raíz.
   - Configurar credenciales DB (`DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`).
   - Configurar `JWT_SECRET` (Mínimo recomendado: hash de 64 caracteres).

4. **Desplegar Servidor:**
   ```bash
   # Entorno de Desarrollo
   npm run dev

   # Entorno de Producción
   npm start
   ```

5. **Apertura:**
   Visitar http://localhost:1234 en el navegador para acceder a la interfaz del sistema.