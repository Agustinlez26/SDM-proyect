import { Database } from './connection.js'

import { ProductModel } from '../models/product.js'
import { ProductService } from '../services/product-service.js'
import { ProductController } from '../controllers/product-controller.js'

import { StockModel } from '../models/stock.js'
import { StockService } from '../services/stock-service.js'
import { StockController } from '../controllers/stock-controller.js'

import { UserModel } from '../models/user.js'
import { UserService } from '../services/user-service.js'
import { UserController } from '../controllers/user-controller.js'

import { AuthService } from '../services/auth-service.js'
import { AuthController } from '../controllers/auth-controller.js'

import { BranchModel } from '../models/branch.js'
import { BranchService } from '../services/branch-service.js'
import { BranchController } from '../controllers/branch-controller.js'

import { MovementModel } from '../models/movements.js'
import { MovementService } from '../services/movement-service.js'
import { MovementController } from '../controllers/movement-controller.js'

import { StatisticModel } from '../models/statistics.js'
import { StatisticService } from '../services/statistic-service.js'
import { StatisticController } from '../controllers/statistic-controller.js'
import { NotificationController } from '../controllers/notification-controller.js'

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
const notificationController = new NotificationController({ statisticService })
const branchController = new BranchController({ branchService })
const movementController = new MovementController({ movementService })

export {
    productController,
    stockController,
    userController,
    authController,
    branchController,
    movementController,
    statisticController,
    notificationController
}