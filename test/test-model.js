// test-model.js
import { ProductModel } from '../src/models/product.js';

// Instanciamos el modelo
const productModel = new ProductModel();

const runTest = async () => {
    console.log("🚀 Iniciando pruebas del ProductModel...");

    try {
        // --- 1. PRUEBA DE CREATE ---
        const newProduct = {
            cod_bar: "TEST-" + Date.now(), // Código único generado por hora
            name: "Producto de Prueba",
            description: "Esta es una descripción de prueba desde el script",
            category_id: 1, // <--- ¡ASEGÚRATE QUE EXISTA LA CATEGORÍA ID 1!
            url_img_original: "uploads/test.webp",
            url_img_small: "uploads/test-small.webp",
            is_active: 1
        };

        console.log("\n1. Intentando crear producto...");
        const newId = await productModel.create(newProduct);
        console.log(`✅ Producto creado con ID: ${newId}`);

        // --- 2. PRUEBA DE FINDBYID ---
        console.log(`\n2. Buscando producto ID ${newId}...`);
        const foundProduct = await productModel.findById(newId);
        console.log("✅ Producto encontrado:", foundProduct);

        // --- 3. PRUEBA DE UPDATE ---
        console.log(`\n3. Actualizando nombre del producto ${newId}...`);
        const updateData = {
            ...newProduct, // Mantenemos los datos viejos
            name: "Producto ACTUALIZADO",
            description: "Descripción cambiada"
        };
        const updated = await productModel.update(newId, updateData);
        console.log(`✅ Resultado actualización: ${updated ? 'Éxito' : 'Fallo'}`);

        // --- 4. PRUEBA DE FINDALL (Búsqueda) ---
        console.log("\n4. Probando buscador (buscando 'ACTUALIZADO')...");
        const searchResults = await productModel.findAll({ search: 'ACTUALIZADO' });
        console.log(`✅ Encontrados: ${searchResults.length} productos.`);
        if(searchResults.length > 0) console.log(searchResults[0]);

        // --- 5. PRUEBA DE CATALOGO ---
        console.log("\n5. Probando vista de catálogo...");
        const catalog = await productModel.searchCatalog();
        console.log(`✅ Catálogo tiene ${catalog.length} items.`);

        // --- 6. PRUEBA DE DESACTIVAR (Soft Delete) ---
        console.log(`\n6. Desactivando producto ${newId}...`);
        const deactivated = await productModel.updateStatus(newId, 0); // 0 = false
        console.log(`✅ Desactivado: ${deactivated}`);

        // Verificamos que ya no salga en catálogo (porque filtra por activos)
        const catalogAfter = await productModel.searchCatalog('ACTUALIZADO');
        console.log(`✅ Buscando en catálogo tras desactivar (Debería ser 0): ${catalogAfter.length}`);

    } catch (error) {
        console.error("❌ ERROR EN LA PRUEBA:", error);
    } finally {
        console.log("\n🏁 Pruebas finalizadas. Presiona Ctrl + C para salir si la DB sigue conectada.");
        process.exit(0);
    }
};

runTest();