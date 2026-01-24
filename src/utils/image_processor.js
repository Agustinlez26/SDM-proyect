import { v4 as uuidv4 } from 'uuid'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import path from 'node:path'
import { slugify } from './string_utils.js'
import { UPLOAD_DIR } from '../config/constants.js'

export const processProductImage = async (fileBuffer, productName) => {
    const rename = slugify(productName)
    const uniqueSuffix = uuidv4().split('-')[0]
    const fileName = `${rename}-${uniqueSuffix}`

    await fs.mkdir(UPLOAD_DIR, { recursive: true })

    const pathOriginal = path.join(UPLOAD_DIR, `${fileName}.webp`)
    const pathSmall = path.join(UPLOAD_DIR, `${fileName}-small.webp`)

    await Promise.all([
        sharp(fileBuffer)
            .webp({ quality: 80 })
            .toFile(pathOriginal),

        sharp(fileBuffer)
            .resize({ width: 300 })
            .webp({ quality: 60 })
            .toFile(pathSmall)
    ])

    return {
        url_img_original: pathOriginal.replace(/\\/g, '/'),
        url_img_small: pathSmall.replace(/\\/g, '/')
    }
}

export const deleteProductImage = async (pathOriginal, pathSmall) => {
    try {
        const deletionPromises = []

        if (pathOriginal) deletionPromises.push(fs.unlink(pathOriginal))
        if (pathSmall) deletionPromises.push(fs.unlink(pathSmall))

        await Promise.all(deletionPromises)
    } catch (error) {
        console.warn(`[ImageProcessor] Advertencia: No se pudo borrar alguna imagen antigua.`, error.message)
    }
}