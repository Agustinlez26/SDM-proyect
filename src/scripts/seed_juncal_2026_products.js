import { Database } from '../config/connection.js'
import { buildSkuBase, withSkuSuffix } from '../utils/sku-utils.js'

const sourceGroups = [
    {
        category: 'Mates',
        products: [
            [1, 'SP'], [2, 'SP PRINCIPE ALPACA BORDO'], [3, 'SP VIROLA ALUMINIO'],
            [4, 'SP COQUITOS'], [5, 'SP CRIOLLOS'], [6, 'MATE ACERO INOX'],
            [7, 'MATE REY BORDO'], [8, 'MATE VQ PRINCIPE BORDO'], [9, 'MATE VQ NEGRO'],
            [10, 'IMPERIAL NEGRO'], [11, 'IMPERIAL MARRON'], [12, 'IMPERIAL ALGARROBO'],
            [64, 'MATE VQ BORDO'], [65, 'MATE VQ MARRON INOX'],
            [66, 'SP PRINCIPE ALPACA MARRON'], [68, 'IMPERIAL BORDO'],
            [88, 'MATE REY MARRON'], [94, 'RANCHERO BLANCO'], [96, 'CRIOLLOS CON VIROLA'],
            [98, 'CRIOLLO NACIONAL'], [102, 'RANCHERO NEGRO'], [105, 'SP ESCUDO ALPACA'],
            [107, 'MATE VQ PRINCIPE MARRON'], [108, 'MATE VQ - BORDO NACIONAL'],
            [118, 'MATE VQ PRINCIPE NEGRO'], [155, 'SP PRINCIPE ALPACA MARRON'],
            [156, 'SP CON LOGO'], [186, 'MATE GALLETA']
        ]
    },
    {
        category: 'Bombillas',
        products: [
            [13, 'INOX'], [14, 'INOX CHATA'], [15, 'ALPACA LISA PL'],
            [16, 'ALPACA LISA PR'], [17, 'TORNEADA PL'], [18, 'TORNEADA PR'],
            [19, 'TORNEADA CORTA PR'], [20, 'BOMBILLON REY'],
            [21, 'PREMIUM UNA BOCHA'], [22, 'PREMIUM DOS BOCHAS'],
            [95, 'BOMBILLA ESCUDO PL'], [99, 'BOMBILLA ESCUDO CORTA TORNEADA'],
            [100, 'BOMBILLA ESCUDO CORTA LISA'], [103, 'BOMBILLA ALPACA PREMIUM CUADRADA'],
            [113, 'BOMBILLA ARGOLLITAS RECTA'], [153, 'BOMBILLA DOBLE BOCHA'],
            [154, 'BOMBILLA UNA BOCHA'], [183, 'BOMBILLA ALPACA SAGRADO CORAZON'],
            [184, 'BOMBILLA ALPACA SOL'], [185, 'BOMBILLA PERSONALIZADA PICO DE LORO']
        ]
    },
    {
        category: 'Yerberos',
        products: [
            [23, 'MORRAL 500G NEGRO'], [24, 'MORRAL 250G NEGRO'],
            [69, 'MORRAL 250G MARRON'], [70, 'MORRAL 500G MARRON'],
            [84, 'MORRAL 250G MARRON GAMUZADO'], [85, 'MORRAL 500G MARRON GAMUZADO'],
            [97, 'YERBERO LATA CC'], [112, 'MORRAL 500G NEGRO GAMUZA'],
            [146, 'MORRAL 250 ESCUDO MARRON'], [147, 'MORRAL 250 MARRON SOL'],
            [152, 'MORRAL 500 ESUDO MARRON']
        ]
    },
    {
        category: 'Mochilas / Materas',
        products: [
            [25, 'MATERA SDM'], [26, 'MATERA SDM ECO'], [27, 'MATERA PATAGONIA - NEGRO'],
            [28, 'MATERA PATAGONIA - ROJO'], [29, 'MATERA PATAGONIA - VERDE'],
            [30, 'MATERA PATAGONIA - AZUL'], [31, 'MATERA PATAGONIA ECO'],
            [32, 'MATERA PAYE - NEGRO'], [33, 'MATERA PAYE - MARRON'],
            [34, 'MATERA IBERA'], [35, 'MATERA PORA'], [36, 'MATERA MORRAL - MARRON'],
            [37, 'MATERA MORRAL - NEGRO'], [38, 'MATERA URUGUAYA CC'],
            [39, 'MATERA URUGUAYA VQ - BORDO'], [40, 'MATERA VQ - SUELA/MARRON'],
            [41, 'MATERA VQ - BORDO'], [86, 'MATERA MORRAL - SUELA'],
            [87, 'MATERA MORRAL - GAMUZA IMAN'], [89, 'MATERA MORRAL - GAMUZA HEBILLA'],
            [104, 'MATERA URUGUAYA VQ - NARANJA'], [111, 'MATERA VQ - NEGRA'],
            [116, 'MATERA MORRAL CHOCOLATE'], [117, 'MATERA PATAGONIA - BORDO'],
            [148, 'MATERA PATAGONIA ECO AZUL ESCUDO'], [149, 'MATERA PATAGONIA ECO AZUL SOL'],
            [150, 'MATERA PATAGONIA ROJO ESCUDO'], [151, 'MATERA PATAGONIA ROJO SOL'],
            [157, 'MATERA SDM SIN LOGO']
        ]
    },
    {
        category: 'Termos',
        products: [
            [46, 'TERMO CC'], [47, 'TERMO TERMOLAR - NEGRO'],
            [48, 'TERMO STANLEY CLASSIC - NEGRO'], [49, 'TERMO STANLEY CLASSIC - VERDE'],
            [50, 'TERMO STANLEY MATE SYSTEM'], [51, 'TERMO STANLEY ADVENTURE'],
            [78, 'TERMO TERMOLAR - GRIS']
        ]
    },
    {
        category: 'Marroquinería',
        products: [
            [42, 'PORTA MATE AUTO CC'], [43, 'PORTA MATE AUTO VQ - BORDO'],
            [44, 'BOLSO DE CUERO - MARRON'], [45, 'BOLSO DE CUERO - NEGRO'],
            [52, 'LLAVEROS'], [53, 'LIBRETA'], [54, 'BILLETERA MARRON'], [55, 'CINTO'],
            [71, 'BASE CUERO CRUDO'], [72, 'PORTA MATE AUTO VQ - NEGRO'],
            [73, 'PORTA MATE AUTO VQ - MARRON'], [83, 'BILLETERA NEGRA'],
            [93, 'BOLSO VALENTI'], [114, 'NECESER CORDURA'], [115, 'NECESER CUERO'],
            [130, 'PORTA BOMBILLA'], [135, 'BOLSO VALENTI VERDE ESCUDO'],
            [136, 'BOLSO VALENTI VERDE SOL'], [160, 'CARTERA ASUNCION SUELA'],
            [161, 'CARTERA MATERA MARRON']
        ]
    },
    {
        category: 'Set de asado',
        products: [
            [56, 'CUCHILLO TIENTO PREMIUM'], [57, 'PLATO ALGARROBO'],
            [58, 'TABLA ASADORA OVALADA'], [67, 'CUCHILLO ALPACA PREMIUM'],
            [101, 'CUCHILLO Y TENEDOR GRANDES'], [106, 'CUCHILLO COMUN'],
            [109, 'CANASTO LEÑERO - LAS CRIOLLITAS'], [110, 'CATRE - LAS CRIOLLITAS']
        ]
    },
    {
        category: 'Indumentaria',
        products: [
            [59, 'GORRAS - NEGRO'], [60, 'GORRAS - BEIGE'], [61, 'CAMPERA SDM TS'],
            [62, 'CAMPERA MONASTERIO'], [63, 'CHALECO SDM TS'], [74, 'CAMPERA SDM TM'],
            [75, 'CAMPERA SDM TL'], [76, 'CAMPERA SDM TXL'], [77, 'CAMPERA SDM TXXL'],
            [79, 'CHALECO SDM TM'], [80, 'CHALECO SDM TL'], [81, 'CHALECO SDM TXL'],
            [82, 'CHALECO SDM TXXL'], [90, 'GORRA VINTAGE VERDE OLIVA LOGO SDM'],
            [91, 'GORRA VINTAGE VERDE OLIVA SOL DE MAYO'], [92, 'GORRA VINTAGE NEGRA LOGO SDM'],
            [119, 'CAMPERA SHOFTSHELL NEGRA SDM TS'], [120, 'CAMPERA SHOFTSHELL NEGRA SDM TM'],
            [121, 'CAMPERA SHOFTSHELL NEGRA SDM TL'], [122, 'CAMPERA SHOFTSHELL NEGRA SDM TXL'],
            [123, 'CAMPERA SHOFTSHELL NEGRA SDM TXXL'], [124, 'CAMPERA SHOFTSHELL OLIVA SDM TS'],
            [125, 'CAMPERA SHOFTSHELL OLIVA SDM TM'], [126, 'CAMPERA SHOFTSHELL OLIVA SDM TL'],
            [127, 'CAMPERA SHOFTSHELL OLIVA SDM TXL'], [128, 'CAMPERA SHOFTSHELL OLIVA SDM TXXL'],
            [129, 'GORRA GRIS'], [131, 'CAMPERA SDM T3XL'], [132, 'CHALECO SDM T3XL'],
            [133, 'GORRA VINTAGE GRIS LOGO SOL'], [134, 'BOINA BORDO ESCUDO'],
            [137, 'GORRAS ROJAS LOGO SOL'], [138, 'GORRAS NEGRAS LOGO CORRIENTES'],
            [139, 'GORRA NEGRA LOGO CAPIBARA'], [140, 'GORRA AZUL ESCUDO'],
            [141, 'GORRA VERDE CAPIBARA'], [142, 'GORRA AZUL VINTAGE ESCUDO'],
            [143, 'GORRA AZUL VINTAGE SOL'], [144, 'GORRA VINTAGE GRIS ESCUDO'],
            [145, 'GORRA VINTAGE GRIS SOL'], [158, 'GORRA TUCKER VERDE OLIVA LOGO NEGRO'],
            [159, 'GORRA VINTAGE NEGRA LOGO SDM NARANJA'], [162, 'GORRA TUCKER NEGRA LOGO NEGRO'],
            [164, 'REMERA CARDO NEGRA'], [165, 'REMERA CARDO BLANCA'],
            [166, 'REMERA ORIGEN NEGRA'], [167, 'REMERA ORIGEN BLANCA'],
            [168, 'REMERA FLOR DEL MBURUCUYÁ BLANCA'], [169, 'REMERA FLOR DEL MBURUCUYÁ NEGRA'],
            [170, 'REMERA SEAN ENTERNOS BLANCA'], [171, 'REMERA SEAN ETERNOS NEGRA'],
            [172, 'REMERA SEAN ETERNOS GRIS'], [173, 'REMERA SOL DE MAYO NEGRA'],
            [174, 'REMERA SOL DE MAYO BLANCA'], [175, 'REMERA SOL DE MAYO GRIS'],
            [176, 'REMERA EL ENCUENTRO BLANCA'], [177, 'REMERA EL ENCUENTRO NEGRA'],
            [178, 'REMERA INDUMENTARIA GAUGHO NEGRA'], [179, 'REMERA INDUMENTARIA GAUCHO BLANCA'],
            [180, 'REMERA SAGRADO CORAZON BLANCA'], [181, 'REMERA SAGRADO CORAZON NEGRA'],
            [182, 'REMERA SAGRADO CORAZON GRIS']
        ]
    },
    { category: 'Combos', products: [] }
]

function normalizeName(value) {
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim()
}

const db = Database.getInstance()
const connection = await db.getConnection()

try {
    await connection.beginTransaction()

    const [categoryRows] = await connection.execute(
        'SELECT id, name, is_active FROM product_categories FOR UPDATE'
    )
    const categoriesByName = new Map(categoryRows.map(row => [normalizeName(row.name), row]))
    const categoryIds = new Map()

    for (const group of sourceGroups) {
        const key = normalizeName(group.category)
        let category = categoriesByName.get(key)

        if (!category) {
            const [result] = await connection.execute(
                'INSERT INTO product_categories (name, is_active) VALUES (?, 1)',
                [group.category]
            )
            category = { id: result.insertId, name: group.category, is_active: 1 }
            categoriesByName.set(key, category)
        } else if (!category.is_active) {
            await connection.execute('UPDATE product_categories SET is_active = 1 WHERE id = ?', [category.id])
        }

        categoryIds.set(group.category, category.id)
    }

    const [existingProducts] = await connection.execute(
        'SELECT id, name, cod_bar FROM products FOR UPDATE'
    )
    const existingNames = new Set(existingProducts.map(product => normalizeName(product.name)))
    const reservedSkus = new Set(existingProducts.map(product => product.cod_bar.toUpperCase()))
    const sourceNames = new Set()
    const inserted = []
    const skippedExisting = []
    const skippedSourceDuplicates = []

    for (const group of sourceGroups) {
        for (const [sourceCode, name] of group.products) {
            const normalizedName = normalizeName(name)

            if (sourceNames.has(normalizedName)) {
                skippedSourceDuplicates.push({ sourceCode, name })
                continue
            }
            sourceNames.add(normalizedName)

            if (existingNames.has(normalizedName)) {
                skippedExisting.push({ sourceCode, name })
                continue
            }

            const baseSku = buildSkuBase(name)
            let sku = baseSku
            let sequence = 2
            while (reservedSkus.has(sku)) {
                sku = withSkuSuffix(baseSku, sequence)
                sequence += 1
            }

            await connection.execute(
                `INSERT INTO products
                    (name, cod_bar, description, category_id, url_img_original, url_img_small, is_active)
                 VALUES (?, ?, ?, ?, '', '', 1)`,
                [name, sku, 'Producto importado desde Inventario Juncal 2026.', categoryIds.get(group.category)]
            )

            existingNames.add(normalizedName)
            reservedSkus.add(sku)
            inserted.push({ sourceCode, name, sku, category: group.category })
        }
    }

    await connection.commit()
    console.log(JSON.stringify({
        inserted: inserted.length,
        skippedExisting,
        skippedSourceDuplicates,
        categories: Object.fromEntries(categoryIds)
    }, null, 2))
} catch (error) {
    await connection.rollback()
    console.error(error)
    process.exitCode = 1
} finally {
    connection.release()
    process.exit()
}
