const SKU_PART_LENGTH = 3
const MAX_SKU_LENGTH = 50

function cleanSkuText(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, ' ')
        .trim()
}

export function buildSkuBase(productName) {
    const cleanName = cleanSkuText(productName)
    if (!cleanName) throw new Error('No se puede generar un SKU sin nombre de producto')

    return cleanName
        .split(/\s+/)
        .map(part => part.slice(0, SKU_PART_LENGTH))
        .join('-')
        .slice(0, MAX_SKU_LENGTH)
}

export function normalizeSku(value) {
    const normalized = cleanSkuText(value).replace(/\s+/g, '-')
    if (!normalized) throw new Error('El SKU no puede estar vacío')
    return normalized.slice(0, MAX_SKU_LENGTH)
}

export function withSkuSuffix(baseSku, sequence) {
    const suffix = `-${sequence}`
    return `${baseSku.slice(0, MAX_SKU_LENGTH - suffix.length)}${suffix}`
}
