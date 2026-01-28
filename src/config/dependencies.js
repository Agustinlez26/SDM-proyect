import { Database } from './connection.js' 

import { ProductModel } from '../models/product.js'
import { ProductService } from '../services/product_service.js'
import { ProductController } from '../controllers/product_controller.js'

import { StockModel } from '../models/stock.js'
import { StockService } from '../services/stock_service.js'
import { StockController } from '../controllers/stock_controller.js'

const db = Database.getInstance()

// Product module
const productModel = new ProductModel(db)
const productService = new ProductService(productModel)
const productController = new ProductController(productService)

// Stock module
const stockModel = new StockModel(db)
const stockService = new StockService({ stockModel })
const stockController = new StockController({ stockService })

export {
    productController,
    stockController
}