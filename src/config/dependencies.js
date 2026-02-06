import { Database } from './connection.js'

import { ProductModel } from '../models/product.js'
import { ProductService } from '../services/product_service.js'
import { ProductController } from '../controllers/product_controller.js'

import { StockModel } from '../models/stock.js'
import { StockService } from '../services/stock_service.js'
import { StockController } from '../controllers/stock_controller.js'

import { UserModel } from '../models/user.js'
import { UserService } from '../services/user_service.js'
import { UserController } from '../controllers/user_controller.js'

import { AuthService } from '../services/auth_service.js'
import { AuthController } from '../controllers/auth_controller.js'

import { BranchModel } from '../models/branch.js'
import { BranchService } from '../services/branch_service.js'
import { BranchController } from '../controllers/branch_controller.js'

const db = Database.getInstance()

const productModel = new ProductModel({ db })
const stockModel = new StockModel({ db })
const userModel = new UserModel({ db })
const branchModel = new BranchModel({ db })

const productService = new ProductService({ productModel })
const stockService = new StockService({ stockModel, branchModel })
const userService = new UserService({ userModel, branchModel })
const authService = new AuthService({ userModel })
const branchService = new BranchService({ branchModel })

const productController = new ProductController({ productService })
const stockController = new StockController({ stockService })
const userController = new UserController({ userService })
const authController = new AuthController({ authService })
const branchController = new BranchController({ branchService })

export {
    productController,
    stockController,
    userController,
    authController,
    branchController
}