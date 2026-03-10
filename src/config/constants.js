import path from 'node:path'

const BASE_DIR = process.cwd()

export const UPLOAD_DIR = path.join(BASE_DIR, 'src', 'public', 'uploads', 'products')
export const PUBLIC_URL_BASE = '/uploads/products'
