-- Bootstrap de base de datos para SDM.
-- Después de ejecutar este archivo, usar `npm run seed:juncal-products`
-- para cargar el catálogo aprobado de Inventario Juncal 2026 y luego
-- `npm run migrate:operations` para instalar producción, artesanos,
-- reservas mayoristas, canales y bultos.
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS railway
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE railway;

CREATE TABLE IF NOT EXISTS provinces (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS cities (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    province_id INT UNSIGNED NOT NULL,
    FOREIGN KEY (province_id) REFERENCES provinces(id)
);

CREATE TABLE IF NOT EXISTS branch_types (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS branches (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city_id INT UNSIGNED NOT NULL,
    branch_type_id INT UNSIGNED NOT NULL,
    is_active BOOLEAN NOT NULL,
    FOREIGN KEY (city_id) REFERENCES cities(id),
    FOREIGN KEY (branch_type_id) REFERENCES branch_types(id)
);

CREATE TABLE IF NOT EXISTS product_categories (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    -- Nombre legado de columna: el sistema almacena aquí el SKU autogenerado.
    cod_bar VARCHAR(50) NOT NULL UNIQUE COMMENT 'SKU del producto',
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    url_img_original VARCHAR(255) NOT NULL,
    url_img_small    VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    item_type ENUM('finished','raw_material','merchandising') NOT NULL DEFAULT 'finished',
    is_sellable BOOLEAN NOT NULL DEFAULT TRUE,
    is_manufacturable BOOLEAN NOT NULL DEFAULT FALSE,
    is_customizable BOOLEAN NOT NULL DEFAULT FALSE,
    production_method ENUM('purchased','internal_workshop','artisan') NOT NULL DEFAULT 'purchased',
    production_branch_id INT UNSIGNED NULL,
    FOREIGN KEY (category_id) REFERENCES product_categories(id)
);

CREATE TABLE IF NOT EXISTS users (
    id BINARY(16) NOT NULL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN NOT NULL,
    branch_id INT UNSIGNED NOT NULL,
    is_active BOOLEAN NOT NULL default TRUE,
    requires_password_change BOOLEAN NOT NULL DEFAULT TRUE,
    current_session_id VARCHAR(255) NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE IF NOT EXISTS product_branch_stock (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    branch_id INT UNSIGNED NOT NULL,
    quantity INT NOT NULL,
    min_quantity INT NOT NULL,
    UNIQUE KEY unique_product_branch (product_id, branch_id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE IF NOT EXISTS movements (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    receipt_number VARCHAR(255) NOT NULL,
    type ENUM('ingreso', 'egreso', 'envio') NOT NULL,
    date DATETIME NOT NULL,
    user_id BINARY(16) NOT NULL,
    origin_branch_id INT UNSIGNED NULL,
    destination_branch_id INT UNSIGNED NULL,
    arrival_date DATETIME NULL,
    status ENUM('pendiente', 'en_proceso', 'entregado') DEFAULT 'pendiente',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (origin_branch_id) REFERENCES branches(id),
    FOREIGN KEY (destination_branch_id) REFERENCES branches(id)
);

CREATE TABLE IF NOT EXISTS movement_details (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    movement_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (movement_id) REFERENCES movements(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Categorías vigentes del catálogo Juncal.
INSERT IGNORE INTO product_categories (name) VALUES
('Marroquinería'),
('Mates'),
('Bombillas'),
('Yerberos'),
('Mochilas / Materas'),
('Termos'),
('Combos'),
('Indumentaria'),
('Set de asado');

-- Provinces
INSERT INTO provinces (name) VALUES
('Corrientes'),
('Buenos Aires');

-- Cities
INSERT INTO cities (name, province_id) VALUES
('Mercedes', 1),         -- Corrientes
('CABA', 2);             -- Buenos Aires

-- Branch Types
INSERT INTO branch_types (id, name) VALUES (1, 'Depósito');
INSERT INTO branch_types (id, name) VALUES (2, 'Punto de Venta');

-- Branches
INSERT INTO branches (name, address, city_id, branch_type_id, is_active) VALUES
('Deposito Mercedes', 'Calle Falsa 123', 1, 1,true ),
('Sucursal CABA', 'Av. Siempre Viva 742', 2, 2,true);

INSERT INTO provinces (name) VALUES
('Catamarca'),
('Chaco'),
('Chubut'),
('Córdoba'),
('Entre Ríos'),
('Formosa'),
('Jujuy'),
('La Pampa'),
('La Rioja'),
('Mendoza'),
('Misiones'),
('Neuquén'),
('Río Negro'),
('Salta'),
('San Juan'),
('San Luis'),
('Santa Cruz'),
('Santa Fe'),
('Santiago del Estero'),
('Tierra del Fuego'),
('Tucumán');

INSERT INTO cities (name, province_id) VALUES
('San Fernando del Valle de Catamarca', (SELECT id FROM provinces WHERE name = 'Catamarca')),
('Andalgalá', (SELECT id FROM provinces WHERE name = 'Catamarca')),
('Belén', (SELECT id FROM provinces WHERE name = 'Catamarca'));

-- Chaco
INSERT INTO cities (name, province_id) VALUES
('Resistencia', (SELECT id FROM provinces WHERE name = 'Chaco')),
('Presidencia Roque Sáenz Peña', (SELECT id FROM provinces WHERE name = 'Chaco')),
('Barranqueras', (SELECT id FROM provinces WHERE name = 'Chaco'));

-- Chubut
INSERT INTO cities (name, province_id) VALUES
('Rawson', (SELECT id FROM provinces WHERE name = 'Chubut')),
('Comodoro Rivadavia', (SELECT id FROM provinces WHERE name = 'Chubut')),
('Trelew', (SELECT id FROM provinces WHERE name = 'Chubut')),
('Puerto Madryn', (SELECT id FROM provinces WHERE name = 'Chubut'));

-- Córdoba
INSERT INTO cities (name, province_id) VALUES
('Córdoba', (SELECT id FROM provinces WHERE name = 'Córdoba')),
('Río Cuarto', (SELECT id FROM provinces WHERE name = 'Córdoba')),
('Villa María', (SELECT id FROM provinces WHERE name = 'Córdoba')),
('Villa Carlos Paz', (SELECT id FROM provinces WHERE name = 'Córdoba'));

-- Entre Ríos
INSERT INTO cities (name, province_id) VALUES
('Paraná', (SELECT id FROM provinces WHERE name = 'Entre Ríos')),
('Concordia', (SELECT id FROM provinces WHERE name = 'Entre Ríos')),
('Gualeguaychú', (SELECT id FROM provinces WHERE name = 'Entre Ríos'));

-- Formosa
INSERT INTO cities (name, province_id) VALUES
('Formosa', (SELECT id FROM provinces WHERE name = 'Formosa')),
('Clorinda', (SELECT id FROM provinces WHERE name = 'Formosa'));

-- Jujuy
INSERT INTO cities (name, province_id) VALUES
('San Salvador de Jujuy', (SELECT id FROM provinces WHERE name = 'Jujuy')),
('San Pedro de Jujuy', (SELECT id FROM provinces WHERE name = 'Jujuy')),
('Palpalá', (SELECT id FROM provinces WHERE name = 'Jujuy'));

-- La Pampa
INSERT INTO cities (name, province_id) VALUES
('Santa Rosa', (SELECT id FROM provinces WHERE name = 'La Pampa')),
('General Pico', (SELECT id FROM provinces WHERE name = 'La Pampa'));

-- La Rioja
INSERT INTO cities (name, province_id) VALUES
('La Rioja', (SELECT id FROM provinces WHERE name = 'La Rioja')),
('Chilecito', (SELECT id FROM provinces WHERE name = 'La Rioja'));

-- Mendoza
INSERT INTO cities (name, province_id) VALUES
('Mendoza', (SELECT id FROM provinces WHERE name = 'Mendoza')),
('San Rafael', (SELECT id FROM provinces WHERE name = 'Mendoza')),
('Godoy Cruz', (SELECT id FROM provinces WHERE name = 'Mendoza')),
('Luján de Cuyo', (SELECT id FROM provinces WHERE name = 'Mendoza'));

-- Misiones
INSERT INTO cities (name, province_id) VALUES
('Posadas', (SELECT id FROM provinces WHERE name = 'Misiones')),
('Oberá', (SELECT id FROM provinces WHERE name = 'Misiones')),
('Eldorado', (SELECT id FROM provinces WHERE name = 'Misiones'));

-- Neuquén
INSERT INTO cities (name, province_id) VALUES
('Neuquén', (SELECT id FROM provinces WHERE name = 'Neuquén')),
('San Martín de los Andes', (SELECT id FROM provinces WHERE name = 'Neuquén')),
('Plottier', (SELECT id FROM provinces WHERE name = 'Neuquén'));

-- Río Negro
INSERT INTO cities (name, province_id) VALUES
('Viedma', (SELECT id FROM provinces WHERE name = 'Río Negro')),
('San Carlos de Bariloche', (SELECT id FROM provinces WHERE name = 'Río Negro')),
('General Roca', (SELECT id FROM provinces WHERE name = 'Río Negro'));

-- Salta
INSERT INTO cities (name, province_id) VALUES
('Salta', (SELECT id FROM provinces WHERE name = 'Salta')),
('San Ramón de la Nueva Orán', (SELECT id FROM provinces WHERE name = 'Salta')),
('Tartagal', (SELECT id FROM provinces WHERE name = 'Salta'));

-- San Juan
INSERT INTO cities (name, province_id) VALUES
('San Juan', (SELECT id FROM provinces WHERE name = 'San Juan')),
('Rawson (San Juan)', (SELECT id FROM provinces WHERE name = 'San Juan')),
('Rivadavia (San Juan)', (SELECT id FROM provinces WHERE name = 'San Juan'));

-- San Luis
INSERT INTO cities (name, province_id) VALUES
('San Luis', (SELECT id FROM provinces WHERE name = 'San Luis')),
('Villa Mercedes', (SELECT id FROM provinces WHERE name = 'San Luis')),
('Merlo', (SELECT id FROM provinces WHERE name = 'San Luis'));

-- Santa Cruz
INSERT INTO cities (name, province_id) VALUES
('Río Gallegos', (SELECT id FROM provinces WHERE name = 'Santa Cruz')),
('Caleta Olivia', (SELECT id FROM provinces WHERE name = 'Santa Cruz')),
('El Calafate', (SELECT id FROM provinces WHERE name = 'Santa Cruz'));

-- Santa Fe
INSERT INTO cities (name, province_id) VALUES
('Santa Fe', (SELECT id FROM provinces WHERE name = 'Santa Fe')),
('Rosario', (SELECT id FROM provinces WHERE name = 'Santa Fe')),
('Venado Tuerto', (SELECT id FROM provinces WHERE name = 'Santa Fe'));

-- Santiago del Estero
INSERT INTO cities (name, province_id) VALUES
('Santiago del Estero', (SELECT id FROM provinces WHERE name = 'Santiago del Estero')),
('La Banda', (SELECT id FROM provinces WHERE name = 'Santiago del Estero'));

-- Tierra del Fuego, Antártida e Islas del Atlántico Sur
INSERT INTO cities (name, province_id) VALUES
('Ushuaia', (SELECT id FROM provinces WHERE name = 'Tierra del Fuego')),
('Río Grande', (SELECT id FROM provinces WHERE name = 'Tierra del Fuego'));

-- Tucumán
INSERT INTO cities (name, province_id) VALUES
('San Miguel de Tucumán', (SELECT id FROM provinces WHERE name = 'Tucumán')),
('Concepción', (SELECT id FROM provinces WHERE name = 'Tucumán')),
('Yerba Buena', (SELECT id FROM provinces WHERE name = 'Tucumán'));

-- El usuario de aplicación y su contraseña deben crearse desde el proveedor
-- de base de datos o mediante variables seguras. No se versionan credenciales.
