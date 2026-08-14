# Base de datos

`sol_de_mayo_schema.sql` es una exportación de la estructura completa utilizada por
la aplicación. No contiene productos, stock, pedidos, movimientos ni otros datos de
prueba.

Para instalarla en una base MySQL vacía:

```bash
mysql -u root -p nombre_base < database/sol_de_mayo_schema.sql
```

El nombre de la base creada debe coincidir con `DB_NAME` en el archivo `.env` de la
computadora donde se ejecutará la aplicación.

El script elimina y vuelve a crear las tablas si ya existen. Por eso debe importarse
en una base nueva o sin información que se necesite conservar.

Después de importarlo se pueden crear los usuarios iniciales y sus permisos con:

```bash
npm run seed:access-roles
```
