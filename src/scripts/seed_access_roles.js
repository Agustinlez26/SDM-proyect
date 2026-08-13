import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import 'dotenv/config'

const seedPassword = process.env.DB_MIGRATION_PASSWORD === '__EMPTY__'
    ? ''
    : (process.env.DB_MIGRATION_PASSWORD ?? (process.env.DB_NO_PASSWORD==='1' ? undefined : process.env.DB_PASSWORD))
const db = await mysql.createConnection({ host:process.env.DB_HOST, user:process.env.DB_MIGRATION_USER ?? process.env.DB_USER, password:seedPassword, database:process.env.DB_NAME, port:Number(process.env.DB_PORT) })
const temporaryPassword = 'SolDeMayo2026!'
const passwordHash = await bcrypt.hash(temporaryPassword, 10)

const profiles = [
    { name:'Segundo', email:'segundo@soldemayo.com', role:'admin', area:'general', branch:1, all:true },
    { name:'Agustin Lezcano', email:'admin@soldemayo.com', role:'stock_manager', area:'general', branch:1, all:true },
    { name:'Lucas', email:'lucas@soldemayo.com', role:'seller', area:'wholesale', branch:1, all:true },
    { name:'Luciana', email:'luciana@soldemayo.com', role:'seller', area:'merchandising', branch:1, all:true },
    { name:'Tomi', email:'tomi@soldemayo.com', role:'seller', area:'retail', branch:2, all:false },
    { name:'Isabela', email:'isa@soldemayo.com', role:'seller', area:'retail', branch:2, all:false }
]

try {
    await db.beginTransaction()
    await db.query("UPDATE branches SET name='Showroom Juncal' WHERE id=2")
    for (const profile of profiles) {
        const [rows] = await db.query('SELECT BIN_TO_UUID(id) id FROM users WHERE email=? LIMIT 1', [profile.email])
        let id = rows[0]?.id
        if (!id) {
            id = randomUUID()
            await db.query(`INSERT INTO users (id,full_name,email,password,is_admin,app_role,area,branch_id,is_active,requires_password_change)
                VALUES (UUID_TO_BIN(?),?,?,?,?,?,?,?,TRUE,TRUE)`, [id,profile.name,profile.email,passwordHash,profile.role==='admin',profile.role,profile.area,profile.branch])
        } else {
            await db.query(`UPDATE users SET full_name=?,is_admin=?,app_role=?,area=?,branch_id=?,is_active=TRUE,current_session_id=NULL WHERE id=UUID_TO_BIN(?)`, [profile.name,profile.role==='admin',profile.role,profile.area,profile.branch,id])
        }
        await db.query('DELETE FROM user_branch_access WHERE user_id=UUID_TO_BIN(?)', [id])
        if (profile.all) await db.query('INSERT INTO user_branch_access (user_id,branch_id) SELECT UUID_TO_BIN(?),id FROM branches WHERE is_active=TRUE', [id])
        else await db.query('INSERT INTO user_branch_access (user_id,branch_id) VALUES (UUID_TO_BIN(?),?)', [id,profile.branch])
    }
    await db.commit()
    console.log('Roles y ubicaciones asignados. Clave temporal para usuarios nuevos:', temporaryPassword)
} catch (error) { await db.rollback(); throw error } finally { await db.end() }
