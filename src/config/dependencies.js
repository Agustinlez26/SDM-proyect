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

import { MovementModel } from '../models/movements.js'
import { MovementService } from '../services/movement_service.js'
import { MovementController } from '../controllers/movement_controller.js'

import { StatisticModel } from '../models/statistics.js'
import { StatisticService } from '../services/statistic_service.js'
import { StatisticController } from '../controllers/statistic_controller.js'

const db = Database.getInstance()

const productModel = new ProductModel({ db })
const stockModel = new StockModel({ db })
const userModel = new UserModel({ db })
const branchModel = new BranchModel({ db })
const movementModel = new MovementModel({ db })
const statisticsModel = new StatisticModel({ db })

const productService = new ProductService({ productModel })
const stockService = new StockService({ stockModel, branchModel })
const userService = new UserService({ userModel, branchModel })
const authService = new AuthService({ userModel })
const branchService = new BranchService({ branchModel })
const movementService = new MovementService({ movementModel, branchModel, stockModel })
const statisticService = new StatisticService({ statisticsModel, productModel })

const productController = new ProductController({ productService })
const stockController = new StockController({ stockService })
const userController = new UserController({ userService })
const authController = new AuthController({ authService })
const statisticController = new StatisticController({ statisticService })
const branchController = new BranchController({ branchService })
const movementController = new MovementController({ movementService })

export {
    productController,
    stockController,
    userController,
    authController,
    branchController,
    movementController,
    statisticController
}