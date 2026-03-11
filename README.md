# Sol de Mayo - Sistema de Gestión de Stock y Sucursales

Plataforma integral y en tiempo real para la administración unificada de inventario, operarios y logística inter-sucursal.

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

**Sol de Mayo** es un sistema web B2B diseñado para resolver y optimizar la logística de empresas con múltiples puntos de venta y depósitos. Su objetivo principal es funcionar como una **Intranet Operativa** mediante la cual administradores y empleados pueden gestionar ingresos, transferencias físicas (envíos) y egresos de mercadería de manera trazable.

El desarrollo centraliza las métricas operativas y aplica un estricto control de acceso basado en roles (RBAC) y ubicación geográfica. Esto previene quiebres de stock y errores de asignación mediante un diseño relacional robusto y sincronización de datos en tiempo real.

---

## Módulos Principales

1. **Gestión de Stock:**
   * Visualización de inventario mediante grillas dinámicas filtrables por sucursal.
   * Paginación procesada del lado del servidor (*Server-Side Pagination*) para optimizar el consumo de memoria.
   * Exportación de lotes y alertas de límites mínimos (Stock Crítico) o Agotamientos (Stock Cero).

2. **Registro de Movimientos:**
   * Trazabilidad completa del ciclo de vida de las transacciones: Ingresos, Egresos y Envíos inter-sucursal.
   * Lógica transaccional: Los envíos permanecen en estado "En Proceso", bloqueando lógicamente las unidades hasta que la sucursal receptora confirma la recepción, garantizando la integridad de los datos.

3. **Gestión de Productos y Sucursales:**
   * Módulo de ABM (Alta, Baja y Modificación) para el catálogo general y la red de sucursales, implementando validación espacial jerárquica (Ciudad/Provincia) mediante *Cascading Dropdowns*.

4. **Dashboard y Business Intelligence (BI):**
   * Alertas automatizadas para la gerencia (ej: detección de envíos pendientes de recepción por más de 48 horas).
   * Historiales de desempeño interanual y cálculo de variaciones porcentuales (KPIs mensuales).

5. **Control de Accesos y Usuarios:**
   * Administración de perfiles de empleados con asignación de privilegios binarios (Administrador/Empleado).
   * Gestión de seguridad de cuentas: expiración de sesiones, bloqueo de accesos anómalos y flujos de reseteo obligatorio de credenciales en el primer ingreso.

---

## Arquitectura (MVC Extendido)

El sistema evoluciona el patrón MVC tradicional, implementando una arquitectura de responsabilidades separadas en cuatro capas para facilitar su escalabilidad y testeo:

* **Rutas (`/routes`):** Encargadas exclusivamente de la definición de endpoints, asignación de middlewares de seguridad y derivación del tráfico.
* **Controladores (`/src/controllers`):** Gestionan el ciclo de vida de la petición HTTP. Extraen los datos de entrada (`req`), aplican validaciones de esquemas estrictos mediante *Zod* y estructuran la respuesta (`res`).
* **Servicios (`/src/services`):** Encapsulan la lógica de negocio central. Son agnósticos al protocolo HTTP, encargándose de los cálculos de métricas, validaciones complejas de negocio y de garantizar la integridad de las transacciones.
* **Modelos (`/src/models`):** Capa dedicada exclusivamente a la persistencia de datos. Ejecutan consultas SQL parametrizadas, orquestando transacciones seguras (`START TRANSACTION` / `COMMIT`) mediante la librería `mysql2/promises`.

---

## Stack Tecnológico

**Backend & Core:**
* **Node.js**: Entorno de ejecución asíncrono orientado a eventos.
* **Express.js**: Framework web para la gestión de enrutamiento y middlewares.
* **Socket.io**: Implementación de WebSockets para comunicación bidireccional en tiempo real.
* **Zod**: Validación declarativa de esquemas y payloads para garantizar la consistencia de los tipos de datos.

**Infraestructura & Base de Datos:**
* **MySQL 2**: Sistema de gestión de base de datos relacional. Emplea `UUID_TO_BIN` para optimizar la indexación y mantener la integridad referencial (`Foreign Keys`) con alto rendimiento.

**Frontend & Interfaz de Usuario:**
* **EJS (Embedded JavaScript)**: Motor de plantillas para *Server-Side Rendering* (SSR).
* **Vanilla JS y CSS Modular**: Arquitectura frontend *Zero-Dependencies* diseñada para minimizar los tiempos de carga y asegurar el rendimiento en dispositivos con recursos limitados. Soporte nativo para *Dark/Light Mode* mediante variables CSS.
* **Chart.js**: Biblioteca para la visualización de métricas e indicadores de gestión.

---

## Seguridad y Rendimiento

El backend está diseñado siguiendo altos estándares de seguridad web para mitigar vulnerabilidades comunes:

* **Rate Limiting y Prevención de DDoS:** Middlewares configurados vía `express-rate-limit` que controlan el volumen de peticiones por IP (validando la IP real detrás del proxy inverso de producción). Se aplican políticas estrictas, como el bloqueo temporal del endpoint de autenticación tras 10 intentos fallidos.
* **Gestión Segura de Sesiones (JWT + Cookies):** Implementación de JSON Web Tokens encapsulados en cookies `HttpOnly` para mitigar ataques XSS. Incluye un sistema de invalidación en base de datos que permite revocar sesiones concurrentes en tiempo real.
* **Cabeceras HTTP Seguras (Helmet):** Configuración estricta de Content-Security-Policy (CSP) para prevenir la inyección de scripts (Cross-Site Scripting) y restringir la carga de recursos de dominios no autorizados.
* **Almacenamiento Criptográfico (Bcrypt):** Las credenciales son procesadas mediante funciones de derivación de claves con *salting* automático, asegurando que ninguna contraseña se almacene en texto plano.
* **Prevención de Mass-Assignment:** Filtrado explícito de los payloads (cuerpos de petición) en la capa de Controladores/Servicios antes de interactuar con la Base de Datos, previniendo vulnerabilidades de escalado de privilegios.

---

## Instalación y Uso Local

1. **Clonar Repositorio:**
   ```bash
   git clone https://github.com/Agustinlez26/SDM-proyect
   cd sol-de-mayo
   ```

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