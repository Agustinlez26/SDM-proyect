# Analisis completo del proyecto Sol de Mayo

Fecha de analisis: 2026-06-25  
Directorio analizado: `SDM-proyect`

## 1. Resumen ejecutivo

Sol de Mayo es una aplicacion web de gestion operativa para inventario, productos, sucursales, usuarios, movimientos logisticos y estadisticas. El proyecto esta construido como una aplicacion monolitica Node.js con Express, vistas EJS renderizadas del lado del servidor, JavaScript/CSS estatico para la interfaz, MySQL como base de datos relacional y Socket.io para refrescos/eventos en tiempo real.

La arquitectura principal sigue un MVC extendido:

- Rutas Express en `routes/`.
- Controladores HTTP en `src/controllers/`.
- Servicios de negocio en `src/services/`.
- Modelos de persistencia SQL en `src/models/`.
- DTOs de salida en `src/dtos/`.
- Validaciones de entrada con Zod en `src/schemas/`.
- Middlewares transversales en `src/middlewares/`.
- Vistas EJS y assets estaticos en `src/public/`.

El dominio central es el control de stock por sucursal. Los movimientos soportados son `ingreso`, `egreso` y `envio`, con reglas especiales para la sucursal principal, identificada en el codigo como `branch_id = 1`.

## 2. Estructura general

```text
SDM-proyect/
|-- app.js
|-- package.json
|-- package-lock.json
|-- README.md
|-- ANALISIS_PROYECTO.md
|-- routes/
|   |-- index.js
|   |-- auth-routes.js
|   |-- branch-routes.js
|   |-- location-routes.js
|   |-- movement-routes.js
|   |-- notification-routes.js
|   |-- product-routes.js
|   |-- statistic-routes.js
|   |-- stock-routes.js
|   |-- user-routes.js
|   `-- view-routes.js
`-- src/
    |-- config/
    |-- controllers/
    |-- dtos/
    |-- middlewares/
    |-- models/
    |-- public/
    |-- schemas/
    |-- scripts/
    |-- services/
    `-- utils/
```

## 3. Stack tecnologico y versiones

El proyecto usa ESM (`"type": "module"`) y se ejecuta con `node app.js`.

### Runtime y framework

- Node.js: no hay version fijada en `package.json` mediante `engines`.
- Express: `5.2.1`.
- EJS: `4.0.1`.
- Socket.io: `^4.8.3`.
- MySQL driver: `mysql2@3.16.1`.

### Seguridad y validacion

- `jsonwebtoken@9.0.3` para JWT.
- `bcryptjs@3.0.3` para hash de passwords.
- `cookie-parser@1.4.7` para cookies.
- `helmet@^8.1.0` para cabeceras HTTP y CSP.
- `express-rate-limit@^8.3.0` para rate limiting.
- `zod@4.3.6` para validacion de payloads y query params.

### Archivos e imagenes

- `multer@^2.1.1` con `memoryStorage`.
- `sharp@0.34.5` para conversion y resize a WebP.
- `uuid@13.0.0` para nombres unicos de imagenes.

### Desarrollo y pruebas

- `jest@^30.2.0`.
- `@types/jest@^30.0.0`.
- Script de test configurado, pero no se encontraron archivos de pruebas en el listado del proyecto.

### Scripts npm

```json
{
  "start": "node app.js",
  "dev": "node --watch app.js",
  "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js"
}
```

## 4. Punto de entrada y configuracion de servidor

El punto de entrada es `app.js`.

Responsabilidades principales:

- Carga variables de entorno con `dotenv/config`.
- Crea una app Express.
- Envuelve Express en `httpServer` mediante `createServer`.
- Inicializa Socket.io sobre el servidor HTTP.
- Configura Helmet con CSP.
- Activa `trust proxy` en `1`.
- Sirve archivos estaticos desde `src/public`.
- Aplica rate limit a `/api` y a vistas.
- Habilita `express.json`, `express.urlencoded` y cookies.
- Monta todas las rutas desde `routes/index.js`.
- Configura EJS con vistas en `src/public/views`.
- Escucha en `process.env.PORT` o `1234`.

Origen CORS para Socket.io:

- Produccion: `https://soldemayoadmin.com`.
- Desarrollo: `*`.

## 5. Variables de entorno detectadas

Variables usadas en el codigo:

| Variable | Uso |
|---|---|
| `PORT` | Puerto HTTP, default `1234`. |
| `NODE_ENV` | Cambia HSTS, cookies seguras y origen Socket.io. |
| `DB_HOST` | Host MySQL. |
| `DB_USER` | Usuario MySQL. |
| `DB_PASSWORD` | Password MySQL. |
| `DB_NAME` | Nombre de base de datos. |
| `DB_PORT` | Puerto MySQL. |
| `JWT_SECRET` | Firma de JWT. |
| `ADMIN_PASS` | Usada por `src/scripts/seed_admin.js`. |

No se encontro archivo `.env.example`. Seria recomendable agregar uno sin secretos.

## 6. Arquitectura por capas

### Rutas

Las rutas se centralizan en `routes/index.js`:

- `/api/products`
- `/api/stocks`
- `/api/users`
- `/api/auth`
- `/api/branches`
- `/api/locations`
- `/api/movements`
- `/api/statistics`
- `/api/notifications`
- `/` para vistas EJS

### Controladores

Los controladores:

- Reciben `req` y `res`.
- Validan entrada con schemas Zod.
- Aplican reglas de autorizacion contextual.
- Delegan a servicios.
- Responden JSON o renderizan vistas.
- Emiten eventos Socket.io despues de cambios relevantes.

### Servicios

Los servicios contienen reglas de negocio:

- `ProductService`: altas, ediciones, imagenes, categorias y soft delete.
- `StockService`: paginacion, filtros, stock bajo/sin stock.
- `UserService`: usuarios, passwords, perfiles, reset.
- `AuthService`: login/logout, JWT, session id.
- `BranchService`: sucursales, tipos, provincias, ciudades.
- `MovementService`: ingresos, egresos, envios, validacion de stock, maquina de estados.
- `StatisticService`: metricas y notificaciones.

### Modelos

Los modelos ejecutan SQL parametrizado mediante `mysql2/promise`. La conexion se centraliza en `Database`, que usa un pool singleton con `connectionLimit: 10`.

Algunos modelos usan transacciones manuales con `beginTransaction`, `commit`, `rollback` y bloqueos `FOR UPDATE`.

### DTOs

Los DTOs formatean respuestas y desacoplan parcialmente los nombres/formatos de base de datos de la API. Hay DTOs para productos, stock, usuarios, sucursales, movimientos, estadisticas, provincias y ciudades.

## 7. Base de datos

No se encontraron migraciones, dumps SQL ni archivos de definicion de esquema en el repositorio. La estructura siguiente esta inferida desde modelos, queries y servicios.

### Motor

- MySQL.
- Driver: `mysql2/promise`.
- Pool de conexiones: `connectionLimit: 10`.

### Tablas inferidas

#### `users`

Campos inferidos:

- `id`: UUID almacenado en binario, se usa `UUID_TO_BIN(?)` y `BIN_TO_UUID(id)`.
- `full_name`
- `email`
- `password`
- `is_admin`
- `branch_id`
- `is_active`
- `requires_password_change`
- `current_session_id`

Relaciones:

- `branch_id` referencia a `branches.id`.

Uso:

- Login.
- Perfil.
- Gestion administrativa.
- Control de sesion unica por `current_session_id`.

#### `branches`

Campos inferidos:

- `id`
- `name`
- `address`
- `city_id`
- `branch_type_id`
- `is_active`

Relaciones:

- `city_id` referencia a `cities.id`.
- `branch_type_id` referencia a `branch_types.id`.

Regla importante:

- La sucursal principal se asume como `id = 1`.

#### `branch_types`

Campos inferidos:

- `id`
- `name`

Uso:

- Catalogo de tipos de sucursal.

#### `provinces`

Campos inferidos:

- `id`
- `name`

Uso:

- Catalogo geografico.

#### `cities`

Campos inferidos:

- `id`
- `name`
- `province_id`

Relaciones:

- `province_id` referencia a `provinces.id`.

#### `products`

Campos inferidos:

- `id`
- `name`
- `cod_bar`
- `description`
- `category_id`
- `url_img_original`
- `url_img_small`
- `is_active`

Relaciones:

- `category_id` referencia a `product_categories.id`.

Uso:

- Catalogo de productos.
- Busqueda por nombre/codigo de barras.
- Soft delete mediante `is_active`.

#### `product_categories`

Campos inferidos:

- `id`
- `name`
- `is_active`

Uso:

- Catalogo de categorias.
- Borrado logico por `is_active = 0`.

#### `product_branch_stock`

Campos inferidos:

- `id`
- `branch_id`
- `product_id`
- `quantity`
- `min_quantity`

Relaciones:

- `branch_id` referencia a `branches.id`.
- `product_id` referencia a `products.id`.

Reglas inferidas:

- Debe existir una restriccion unica sobre `(branch_id, product_id)` para que funcione `ON DUPLICATE KEY UPDATE`.
- `quantity <= min_quantity` representa stock critico.
- `quantity = 0` representa sin stock.

#### `movements`

Campos inferidos:

- `id`
- `receipt_number`
- `type`
- `date`
- `arrival_date`
- `user_id`
- `origin_branch_id`
- `destination_branch_id`
- `status`
- `created_at`

Valores usados:

- `type`: `ingreso`, `egreso`, `envio` en servicios/controladores. En algunas consultas/documentacion aparecen tambien en mayusculas.
- `status`: `pendiente`, `en_proceso`, `entregado`. En un controlador aparece `en_progreso`, aunque el servicio luego setea `pendiente` para envios.

Relaciones:

- `user_id` referencia a `users.id`.
- `origin_branch_id` referencia a `branches.id`.
- `destination_branch_id` referencia a `branches.id`.

#### `movement_details`

Campos inferidos:

- `id`
- `movement_id`
- `product_id`
- `quantity`

Relaciones:

- `movement_id` referencia a `movements.id`.
- `product_id` referencia a `products.id`.

## 8. Flujos de negocio principales

### Autenticacion

1. `POST /api/auth/login` valida email/password con Zod.
2. `AuthService` busca usuario por email.
3. Valida estado activo.
4. Compara password con bcrypt.
5. Genera `session_id` con `crypto.randomUUID`.
6. Guarda `current_session_id` en la tabla `users`.
7. Firma JWT con expiracion de 4 horas.
8. Setea cookie `access_token` `HttpOnly`, `SameSite=Strict`.

El middleware `checkAuth` valida:

- Existencia de cookie.
- JWT valido.
- Que `session_id` coincida con `current_session_id` en base de datos.

Esto implementa una politica de sesion unica: si un usuario inicia sesion desde otro lugar, la sesion anterior queda invalidada.

### Primer cambio de password

Si el JWT contiene `requires_password_change`, el middleware `requirePasswordChange` redirige a `/firstpass`. La ruta `/firstpass` usa `allowPasswordChangeOnly` para impedir que usuarios que ya cambiaron password entren a esa pantalla.

### Productos

- Alta de productos con imagen obligatoria/procesada.
- Validacion de nombre y codigo de barras duplicados.
- Imagen original y miniatura en WebP.
- Edicion parcial.
- Reemplazo de imagen eliminando archivos anteriores.
- Borrado logico con `is_active = false`.
- Reactivacion.
- ABM parcial de categorias.

### Stock

- Stock por producto y sucursal.
- Filtros por busqueda, categoria, sucursal, stock bajo y stock cero.
- Paginacion con page size fijo de 20.
- Actualizacion manual de `quantity` y `min_quantity`.
- Eliminacion fisica de registro de stock.

### Movimientos

Tipos:

- `ingreso`: suma stock en sucursal principal (`branch_id = 1`), queda `entregado`.
- `egreso`: resta stock en sucursal origen, queda `entregado`.
- `envio`: resta stock en sucursal principal, queda `pendiente`.

Maquina de estados de envio:

```text
pendiente -> en_proceso -> entregado
```

Detalle:

- Al crear un envio se descuenta stock del origen.
- Al despachar solo cambia estado a `en_proceso`.
- Al recibir se suma stock en destino y se marca `arrival_date`.
- Las transiciones usan transacciones y `SELECT ... FOR UPDATE`.

### Estadisticas y notificaciones

Metricas detectadas:

- Top 5 productos con mas egresos.
- Egresos mensuales por anio.
- Performance por sucursal y mes.
- Estacionalidad por producto.
- Producto aleatorio activo.
- Comparacion de egresos mes actual vs mes anterior.
- Conteo de envios pendientes.

Notificaciones:

- Para empleados: stock critico, stock cero, envios entrantes.
- Para administradores: stock critico global, envios estancados por mas de 48 horas, envios entregados recientemente.

## 9. Endpoints principales

### Vistas

- `GET /`
- `GET /login`
- `GET /firstpass`
- `GET /stock`
- `GET /products`
- `GET /movements`
- `GET /operations`
- `GET /stats`
- `GET /branches`
- `GET /users`
- `GET /profile`

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`

### Productos

- `GET /api/products/catalog`
- `GET /api/products`
- `POST /api/products`
- `GET /api/products/categories`
- `POST /api/products/categories`
- `DELETE /api/products/categories/:id`
- `GET /api/products/:id`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`
- `PATCH /api/products/activate/:id`

### Stock

- `GET /api/stocks`
- `GET /api/stocks/catalog`
- `GET /api/stocks/low-stock/count`
- `GET /api/stocks/out-stock/count`
- `GET /api/stocks/:id`
- `PATCH /api/stocks/:id`
- `DELETE /api/stocks/:id`

### Usuarios

- `PATCH /api/users/change-password`
- `GET /api/users/me`
- `PATCH /api/users/:id`
- `GET /api/users/list`
- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users`
- `PATCH /api/users/:id/status`
- `PATCH /api/users/reset-password/:id`

### Sucursales y ubicaciones

- `GET /api/branches/cities`
- `GET /api/branches/provinces`
- `GET /api/branches`
- `GET /api/branches/catalog`
- `GET /api/branches/types`
- `GET /api/branches/:id`
- `POST /api/branches`
- `PATCH /api/branches/:id`
- `DELETE /api/branches/:id`
- `PATCH /api/branches/active/:id`
- `GET /api/locations/cities`
- `GET /api/locations/provinces`

### Movimientos

- `GET /api/movements`
- `GET /api/movements/recent`
- `GET /api/movements/shipments`
- `POST /api/movements`
- `GET /api/movements/:id`
- `GET /api/movements/:id/details`
- `PATCH /api/movements/changeStatus/:id`

### Estadisticas

- `GET /api/statistics/top-selling-products`
- `GET /api/statistics/monthly-egresses`
- `GET /api/statistics/branch-performance`
- `GET /api/statistics/product-seasonality/:id`
- `GET /api/statistics/random-product`
- `GET /api/statistics/comparation-egresses`
- `GET /api/statistics/pending-shipments-count`

### Notificaciones

- `GET /api/notifications`

## 10. Seguridad

Controles implementados:

- JWT en cookie `HttpOnly`.
- `SameSite=Strict`.
- Cookie `secure` en produccion.
- Expiracion JWT de 4 horas.
- Sesion unica con `current_session_id`.
- Password hashing con bcrypt.
- RBAC basico con `is_admin`.
- Middleware `checkAuth`.
- Middleware `isAdmin`.
- Rate limit:
  - Vistas: 200 requests / 15 min.
  - API: 1000 requests / 15 min.
  - Login: 10 intentos / 10 min, omite exitosos.
- Helmet con CSP.
- Limite JSON/urlencoded de 1 MB.
- Uploads limitados a 20 MB y mimetype `image/*`.
- Queries SQL parametrizadas.
- Listas blancas de campos para inserts/updates en modelos.

Puntos a revisar:

- No hay `CSRF token`; con cookies de sesion, `SameSite=Strict` ayuda, pero no cubre todos los escenarios.
- CSP permite `'unsafe-inline'` en scripts y estilos.
- `trust proxy = 1` debe coincidir con la infraestructura real.
- El filtro de uploads valida `mimetype`, pero seria mas robusto validar contenido real del archivo.

## 11. Frontend

El frontend es server-rendered con EJS y comportamiento en Vanilla JS.

Estructura:

- `src/public/views/pages/`: paginas.
- `src/public/views/partials/`: navbar, sidebar, head y modales.
- `src/public/css/`: estilos por pagina, parciales y componentes.
- `src/public/js/`: scripts por pagina y componentes.
- `src/public/imgs/`: imagenes base.
- `src/public/uploads/products/`: imagenes de productos generadas/subidas.

Paginas detectadas:

- Dashboard.
- Login.
- Primer cambio de password.
- Stock.
- Productos.
- Movimientos.
- Operaciones.
- Estadisticas.
- Sucursales.
- Usuarios.
- Mi perfil.

## 12. Tiempo real

Socket.io se configura en `app.js` y se guarda en `app.set('io', io)`.

Eventos emitidos detectados:

- `new_product`
- `product_updated`
- `product_deleted`
- `product_activated`
- `new_category`
- `category_deleted`
- `stock_updated`
- `stock_deleted`
- `new_movement`
- `movements_updated`
- `new_branch`
- `branch_updated`
- `branch_deleted`
- `brach_activated` (posible typo)
- `new_user`
- `user_updated`
- `user_toggle`

No se detectaron namespaces ni rooms; los eventos se emiten globalmente con `io.emit`.

## 13. Gestion de archivos e imagenes

Los productos usan upload de imagen mediante Multer en memoria. Luego `sharp` genera:

- Imagen original WebP con calidad 80.
- Imagen chica WebP de ancho 300px con calidad 60.

Destino fisico:

```text
src/public/uploads/products/
```

URL publica:

```text
/uploads/products/<archivo>.webp
```

El nombre se compone con `slugify(productName)` mas un sufijo UUID corto.

## 14. Observaciones tecnicas y riesgos

1. No hay migraciones ni schema SQL versionado.
   - Impacto: dificil reproducir ambiente, auditar cambios de base o desplegar con confianza.
   - Recomendacion: agregar `migrations/` o al menos `database/schema.sql` y `database/seed.sql`.

2. No hay `.env.example`.
   - Impacto: onboarding y despliegue dependen de conocimiento externo.
   - Recomendacion: documentar variables requeridas sin secretos.

3. `package.json` no define version de Node.
   - Impacto: posibles diferencias entre ambientes.
   - Recomendacion: agregar `"engines": { "node": ">=20" }` o la version real usada.

4. Hay diferencias de casing/valores en movimientos.
   - En queries aparecen valores como `'egreso'`, mientras algunos comentarios mencionan `INGRESO/EGRESO/ENVIO`.
   - En `MovementController.create`, el payload inicial usa `status: 'en_progreso'` para envios, pero `MovementService.create` lo reemplaza por `pendiente`.
   - Recomendacion: centralizar enums de `type` y `status`.

5. Posible typo de evento Socket.io.
   - `brach_activated` probablemente deberia ser `branch_activated`.

6. `routes/location-routes.js` duplica endpoints de provincias/ciudades ya presentes en `branch-routes.js`, con permisos distintos.
   - Recomendacion: unificar o documentar diferencia de permisos.

7. No se encontraron tests.
   - Hay Jest configurado, pero no archivos de prueba visibles.
   - Recomendacion: empezar por tests de servicios criticos: auth, movimientos y stock.

8. `StockModel.outStock` parece devolver una estructura distinta a `lowStock`.
   - `lowStock` retorna `rows[0].count`.
   - `outStock` retorna `rows[0]` sobre el resultado completo de `this.#db.query`, lo que podria no devolver directamente el count esperado.
   - Recomendacion: revisar este metodo.

9. `MovementService.findDetails` verifica `if (!movement)`, pero un array vacio es truthy.
   - Impacto: si no hay detalles, no lanza `NotFoundError`.
   - Recomendacion: validar `movement.length === 0`.

10. CSP permite inline scripts y estilos.
    - Puede ser necesario por EJS/frontend actual, pero reduce proteccion XSS.
    - Recomendacion: migrar gradualmente a scripts externos/nonces.

11. No hay gestion explicita de rooms en Socket.io.
    - Todos los clientes reciben todos los eventos.
    - Recomendacion: evaluar rooms por rol/sucursal si la escala o privacidad lo requiere.

## 15. Recomendaciones priorizadas

Prioridad alta:

- Agregar schema/migraciones de base de datos.
- Crear `.env.example`.
- Corregir/revisar `StockModel.outStock`.
- Centralizar enums de movimientos y estados.
- Agregar tests de movimientos, stock y autenticacion.

Prioridad media:

- Documentar version de Node en `package.json`.
- Unificar rutas de ubicacion.
- Corregir typo `brach_activated`.
- Agregar manejo de errores especifico para Multer.
- Revisar politicas CSP e inline scripts.

Prioridad baja:

- Separar eventos Socket.io por rooms.
- Agregar paginacion con metadata total/count.
- Crear documentacion OpenAPI o coleccion Postman/Bruno.
- Mover uploads a storage persistente externo si se despliega en infraestructura efimera.

## 16. Estado general

El proyecto tiene una arquitectura clara y bastante separada para una aplicacion monolitica Express. La capa de servicios contiene las reglas de negocio importantes y la capa de modelos usa SQL parametrizado y transacciones donde corresponde.

Los puntos mas debiles no estan en la estructura de codigo sino en operabilidad y mantenibilidad: falta versionar la base de datos, falta documentar entorno, falta fijar version de Node y faltan tests automatizados para los flujos criticos.

