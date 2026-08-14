-- MySQL dump 10.13  Distrib 8.4.3, for Win64 (x86_64)
--
-- Host: localhost    Database: railway
-- ------------------------------------------------------
-- Server version	8.4.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `artisans`
--

DROP TABLE IF EXISTS `artisans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `artisans` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `branch_id` int unsigned NOT NULL,
  `specialty` varchar(180) DEFAULT NULL,
  `notes` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_artisan_branch` (`branch_id`),
  CONSTRAINT `fk_artisan_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `branch_types`
--

DROP TABLE IF EXISTS `branch_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `city_id` int unsigned NOT NULL,
  `branch_type_id` int unsigned NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `city_id` (`city_id`),
  KEY `branch_type_id` (`branch_type_id`),
  CONSTRAINT `branches_ibfk_1` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `branches_ibfk_2` FOREIGN KEY (`branch_type_id`) REFERENCES `branch_types` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cities`
--

DROP TABLE IF EXISTS `cities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cities` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `province_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `province_id` (`province_id`),
  CONSTRAINT `cities_ibfk_1` FOREIGN KEY (`province_id`) REFERENCES `provinces` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `movement_details`
--

DROP TABLE IF EXISTS `movement_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movement_details` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `movement_id` int unsigned NOT NULL,
  `product_id` int unsigned NOT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `movement_id` (`movement_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `movement_details_ibfk_1` FOREIGN KEY (`movement_id`) REFERENCES `movements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `movement_details_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `movements`
--

DROP TABLE IF EXISTS `movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movements` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `receipt_number` varchar(255) NOT NULL,
  `request_key` varchar(64) DEFAULT NULL,
  `type` enum('ingreso','egreso','envio') NOT NULL,
  `egress_reason` enum('sale','return','exchange') DEFAULT NULL,
  `sale_channel` enum('mercado_libre','tienda_nube','mayorista','merchandising','showroom') DEFAULT NULL,
  `explanation` text,
  `order_id` int unsigned DEFAULT NULL,
  `movement_purpose` enum('standard','wholesale_order') NOT NULL DEFAULT 'standard',
  `requested_by` binary(16) DEFAULT NULL,
  `confirmed_by` binary(16) DEFAULT NULL,
  `date` datetime NOT NULL,
  `user_id` binary(16) NOT NULL,
  `origin_branch_id` int unsigned DEFAULT NULL,
  `destination_branch_id` int unsigned DEFAULT NULL,
  `arrival_date` datetime DEFAULT NULL,
  `status` enum('pendiente','en_proceso','entregado') DEFAULT 'pendiente',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_movements_request_key` (`request_key`),
  KEY `user_id` (`user_id`),
  KEY `origin_branch_id` (`origin_branch_id`),
  KEY `destination_branch_id` (`destination_branch_id`),
  KEY `idx_movements_order` (`order_id`),
  CONSTRAINT `fk_movements_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `movements_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `movements_ibfk_2` FOREIGN KEY (`origin_branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `movements_ibfk_3` FOREIGN KEY (`destination_branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_audit_logs`
--

DROP TABLE IF EXISTS `order_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_audit_logs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `changed_by` binary(16) NOT NULL,
  `action` enum('reservation_edit','admin_correction') NOT NULL,
  `reason` varchar(500) NOT NULL,
  `before_data` json NOT NULL,
  `after_data` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_audit_order` (`order_id`,`created_at`),
  KEY `fk_order_audit_user` (`changed_by`),
  CONSTRAINT `fk_order_audit_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_order_audit_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `product_id` int unsigned NOT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_order_product` (`order_id`,`product_id`),
  KEY `fk_order_items_product` (`product_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_number` varchar(60) NOT NULL,
  `request_key` varchar(64) DEFAULT NULL,
  `channel` enum('mercado_libre','tienda_nube','mayorista','merchandising','showroom') NOT NULL,
  `customer_reference` varchar(180) NOT NULL,
  `delivery_type` enum('pickup','shipping') NOT NULL DEFAULT 'pickup',
  `shipping_method` enum('via_cargo','uber','correo_argentino','other') DEFAULT NULL,
  `shipping_method_detail` varchar(120) DEFAULT NULL,
  `branch_id` int unsigned NOT NULL,
  `status` enum('reserved','completed','cancelled') NOT NULL DEFAULT 'reserved',
  `notes` text,
  `movement_id` int unsigned DEFAULT NULL,
  `created_by` binary(16) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  UNIQUE KEY `uq_orders_request_key` (`request_key`),
  KEY `fk_orders_branch` (`branch_id`),
  KEY `fk_orders_movement` (`movement_id`),
  KEY `fk_orders_user` (`created_by`),
  CONSTRAINT `fk_orders_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_orders_movement` FOREIGN KEY (`movement_id`) REFERENCES `movements` (`id`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_branch_stock`
--

DROP TABLE IF EXISTS `product_branch_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_branch_stock` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int unsigned NOT NULL,
  `branch_id` int unsigned NOT NULL,
  `quantity` int NOT NULL,
  `min_quantity` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_branch` (`product_id`,`branch_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `product_branch_stock_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `product_branch_stock_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_categories`
--

DROP TABLE IF EXISTS `product_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_personalization_methods`
--

DROP TABLE IF EXISTS `product_personalization_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_personalization_methods` (
  `product_id` int unsigned NOT NULL,
  `method` enum('laser_internal','artisan_metalwork') NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`product_id`,`method`),
  CONSTRAINT `fk_personalization_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_recipes`
--

DROP TABLE IF EXISTS `product_recipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_recipes` (
  `output_product_id` int unsigned NOT NULL,
  `material_product_id` int unsigned NOT NULL,
  `quantity_per_unit` decimal(10,3) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`output_product_id`,`material_product_id`),
  KEY `fk_recipe_material` (`material_product_id`),
  CONSTRAINT `fk_recipe_material` FOREIGN KEY (`material_product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_recipe_output` FOREIGN KEY (`output_product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_sales_channels`
--

DROP TABLE IF EXISTS `product_sales_channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_sales_channels` (
  `product_id` int unsigned NOT NULL,
  `channel_id` int unsigned NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`product_id`,`channel_id`),
  KEY `fk_psc_channel` (`channel_id`),
  CONSTRAINT `fk_psc_channel` FOREIGN KEY (`channel_id`) REFERENCES `sales_channels` (`id`),
  CONSTRAINT `fk_psc_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `cod_bar` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) NOT NULL,
  `category_id` int unsigned NOT NULL,
  `url_img_original` varchar(255) NOT NULL,
  `url_img_small` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `item_type` enum('finished','raw_material','merchandising') NOT NULL DEFAULT 'finished',
  `is_sellable` tinyint(1) NOT NULL DEFAULT '1',
  `is_manufacturable` tinyint(1) NOT NULL DEFAULT '0',
  `is_customizable` tinyint(1) NOT NULL DEFAULT '0',
  `production_branch_id` int unsigned DEFAULT NULL,
  `production_method` enum('purchased','internal_workshop','artisan') NOT NULL DEFAULT 'purchased',
  PRIMARY KEY (`id`),
  UNIQUE KEY `cod_bar` (`cod_bar`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=206 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `provinces`
--

DROP TABLE IF EXISTS `provinces`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `provinces` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales_channels`
--

DROP TABLE IF EXISTS `sales_channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_channels` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(30) NOT NULL,
  `name` varchar(80) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shipment_order_packages`
--

DROP TABLE IF EXISTS `shipment_order_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipment_order_packages` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `movement_id` int unsigned NOT NULL,
  `order_id` int unsigned NOT NULL,
  `package_count` int unsigned NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shipment_package_order` (`order_id`),
  KEY `idx_shipment_package_movement` (`movement_id`),
  CONSTRAINT `fk_shipment_package_movement` FOREIGN KEY (`movement_id`) REFERENCES `movements` (`id`),
  CONSTRAINT `fk_shipment_package_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shipment_package_items`
--

DROP TABLE IF EXISTS `shipment_package_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipment_package_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `package_id` int unsigned NOT NULL,
  `product_id` int unsigned NOT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_package_item_package` (`package_id`),
  KEY `fk_package_item_product` (`product_id`),
  CONSTRAINT `fk_package_item_package` FOREIGN KEY (`package_id`) REFERENCES `shipment_packages` (`id`),
  CONSTRAINT `fk_package_item_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shipment_packages`
--

DROP TABLE IF EXISTS `shipment_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipment_packages` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `package_code` varchar(50) NOT NULL,
  `movement_id` int unsigned DEFAULT NULL,
  `package_type` enum('wholesale_order','replenishment','work_order','other') NOT NULL,
  `wholesale_order_id` int unsigned DEFAULT NULL,
  `status` enum('prepared','in_transit','received','delivered') NOT NULL DEFAULT 'prepared',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `customer_reference` varchar(180) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `package_code` (`package_code`),
  KEY `fk_package_movement` (`movement_id`),
  KEY `fk_package_wholesale` (`wholesale_order_id`),
  CONSTRAINT `fk_package_movement` FOREIGN KEY (`movement_id`) REFERENCES `movements` (`id`),
  CONSTRAINT `fk_package_wholesale` FOREIGN KEY (`wholesale_order_id`) REFERENCES `wholesale_orders` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stock_reservations`
--

DROP TABLE IF EXISTS `stock_reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_reservations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int unsigned NOT NULL,
  `branch_id` int unsigned NOT NULL,
  `wholesale_order_id` int unsigned DEFAULT NULL,
  `work_order_id` int unsigned DEFAULT NULL,
  `quantity` int NOT NULL,
  `status` enum('active','fulfilled','released') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `order_id` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_res_product` (`product_id`),
  KEY `fk_res_wholesale` (`wholesale_order_id`),
  KEY `fk_res_work_order` (`work_order_id`),
  KEY `idx_res_order` (`order_id`),
  KEY `idx_reservations_stock_lookup` (`branch_id`,`product_id`,`status`),
  CONSTRAINT `fk_res_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_res_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_res_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_res_wholesale` FOREIGN KEY (`wholesale_order_id`) REFERENCES `wholesale_orders` (`id`),
  CONSTRAINT `fk_res_work_order` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_branch_access`
--

DROP TABLE IF EXISTS `user_branch_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_branch_access` (
  `user_id` binary(16) NOT NULL,
  `branch_id` int unsigned NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`user_id`,`branch_id`),
  KEY `fk_access_branch` (`branch_id`),
  CONSTRAINT `fk_access_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_access_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` binary(16) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `is_admin` tinyint(1) NOT NULL,
  `app_role` enum('admin','stock_manager','seller') NOT NULL DEFAULT 'seller',
  `area` enum('general','wholesale','retail','merchandising') NOT NULL DEFAULT 'retail',
  `branch_id` int unsigned NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `requires_password_change` tinyint(1) NOT NULL DEFAULT '1',
  `current_session_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wholesale_order_items`
--

DROP TABLE IF EXISTS `wholesale_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wholesale_order_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `product_id` int unsigned NOT NULL,
  `quantity` int NOT NULL,
  `quantity_reserved` int NOT NULL DEFAULT '0',
  `quantity_delivered` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_wholesale_item_order` (`order_id`),
  KEY `fk_wholesale_item_product` (`product_id`),
  CONSTRAINT `fk_wholesale_item_order` FOREIGN KEY (`order_id`) REFERENCES `wholesale_orders` (`id`),
  CONSTRAINT `fk_wholesale_item_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wholesale_orders`
--

DROP TABLE IF EXISTS `wholesale_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wholesale_orders` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) NOT NULL,
  `customer_reference` varchar(180) NOT NULL,
  `pickup_branch_id` int unsigned NOT NULL,
  `status` enum('draft','partial','reserved','in_transit','ready','delivered','cancelled') NOT NULL DEFAULT 'draft',
  `notes` text,
  `created_by` binary(16) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `fk_wholesale_pickup_branch` (`pickup_branch_id`),
  KEY `fk_wholesale_user` (`created_by`),
  CONSTRAINT `fk_wholesale_pickup_branch` FOREIGN KEY (`pickup_branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_wholesale_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `work_order_materials`
--

DROP TABLE IF EXISTS `work_order_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_order_materials` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `work_order_id` int unsigned NOT NULL,
  `product_id` int unsigned NOT NULL,
  `quantity_sent` int NOT NULL DEFAULT '0',
  `quantity_consumed` int NOT NULL DEFAULT '0',
  `quantity_returned` int NOT NULL DEFAULT '0',
  `quantity_discarded` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_wom_order` (`work_order_id`),
  KEY `fk_wom_product` (`product_id`),
  CONSTRAINT `fk_wom_order` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`),
  CONSTRAINT `fk_wom_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `work_order_outputs`
--

DROP TABLE IF EXISTS `work_order_outputs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_order_outputs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `work_order_id` int unsigned NOT NULL,
  `product_id` int unsigned NOT NULL,
  `quantity_requested` int NOT NULL,
  `quantity_received` int NOT NULL DEFAULT '0',
  `quantity_rejected` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_woo_order` (`work_order_id`),
  KEY `fk_woo_product` (`product_id`),
  CONSTRAINT `fk_woo_order` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`),
  CONSTRAINT `fk_woo_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `work_orders`
--

DROP TABLE IF EXISTS `work_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_orders` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `type` enum('manufacturing','customization','external_commission') NOT NULL,
  `origin_branch_id` int unsigned NOT NULL,
  `artisan_id` int unsigned DEFAULT NULL,
  `wholesale_order_id` int unsigned DEFAULT NULL,
  `status` enum('draft','sent','in_progress','partial','completed','cancelled') NOT NULL DEFAULT 'draft',
  `due_date` date DEFAULT NULL,
  `artisan_cost` decimal(12,2) DEFAULT NULL,
  `cost_currency` char(3) NOT NULL DEFAULT 'ARS',
  `notes` text,
  `created_by` binary(16) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `personalization_method` enum('laser_internal','artisan_metalwork') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `fk_wo_branch` (`origin_branch_id`),
  KEY `fk_wo_artisan` (`artisan_id`),
  KEY `fk_wo_wholesale` (`wholesale_order_id`),
  KEY `fk_wo_user` (`created_by`),
  CONSTRAINT `fk_wo_artisan` FOREIGN KEY (`artisan_id`) REFERENCES `artisans` (`id`),
  CONSTRAINT `fk_wo_branch` FOREIGN KEY (`origin_branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_wo_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_wo_wholesale` FOREIGN KEY (`wholesale_order_id`) REFERENCES `wholesale_orders` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'railway'
--

--
-- Dumping routines for database 'railway'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-14 12:13:16
