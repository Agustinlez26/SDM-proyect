// src/scripts/seed_admin.js
import { Database } from "../config/connection.js";
import { User } from "../models/user_model.js";
import { UserService } from "../services/user_service.js";

async function seedAdmin() {
    console.log('🌱 Iniciando creación de Super Admin...');

    const db = Database.getInstance();
    const userModel = new User(db);
    const userService = new UserService(userModel);

    const adminEmail = 'admin@soldemayo.com';
    const adminPassword = process.env.ADMIN_PASS;

    try {
        const existing = await userModel.findByEmail(adminEmail);
        
        if (existing) {
            console.log('⚠️ El usuario Admin ya existe. No se hizo nada.');
            process.exit(0);
        }

        const adminData = {
            full_name: "Super Admin",
            email: adminEmail,
            password: adminPassword,
            phone: "000000000",
            branch_id: 1,
            is_admin: true,
            is_active: true,
            requires_password_change: 1
        };

        const newId = await userService.create(adminData, true);

        console.log(`✅ Super Admin creado con éxito. ID: ${newId}`);
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔑 Pass Temporal: ${adminPassword}`);

    } catch (error) {
        console.error('❌ Error creando Admin:', error);
    } finally {
        process.exit();
    }
}

seedAdmin();