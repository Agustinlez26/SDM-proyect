// src/scripts/seed_admin.js
import 'dotenv/config'
import { Database } from "../config/connection.js";
import { UserModel } from "../models/user.js";
import { BranchModel } from '../models/branch.js';
import { UserService } from "../services/user-service.js";
import 'dotenv/config';

async function seedAdmin() {

    const db = Database.getInstance();
    const userModel = new UserModel({ db });
    const branchModel = new BranchModel({ db })
    const userService = new UserService({ userModel, branchModel });

    const adminEmail = 'admin@soldemayo.com';
    const adminPassword = process.env.ADMIN_PASS;

    try {
        const existing = await userModel.findByEmail(adminEmail);

        if (existing) {

            process.exit(0);
        }

        const adminData = {
            full_name: "Super Admin",
            email: adminEmail,
            password: adminPassword,
            branch_id: 1,
            is_admin: true,
            is_active: true,
            requires_password_change: 1
        };

        const newId = await userService.create(adminData, true);





    } catch (error) {
        console.error('❌ Error creando Admin:', error);
    } finally {
        process.exit();
    }
}

seedAdmin();
