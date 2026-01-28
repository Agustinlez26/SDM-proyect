import { v4 as uuidv4 } from 'uuid'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import path from 'node:path'
import { slugify } from './string_utils.js'
import { UPLOAD_DIR, PUBLIC_URL_BASE } from '../config/constants.js'

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
        url_img_original: `${PUBLIC_URL_BASE}/${fileName}.webp`,
        url_img_small: `${PUBLIC_URL_BASE}/${fileName}-small.webp`
    }
}

export const deleteProductImage = async (urlOriginal, urlSmall) => {
    try {
        const deletionPromises = []

        if (urlOriginal) {
            const fileName = path.basename(urlOriginal)
            const physicalPath = path.join(UPLOAD_DIR, fileName)
            deletionPromises.push(fs.unlink(physicalPath))
        }

        if (urlSmall) {
            const fileName = path.basename(urlSmall)
            const physicalPath = path.join(UPLOAD_DIR, fileName)
            deletionPromises.push(fs.unlink(physicalPath))
        }

        await Promise.all(deletionPromises)
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn(`[ImageProcessor] Error al borrar imagen:`, error.message)
        }
    }
}