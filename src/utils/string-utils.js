export const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita tildes (á -> a)
        .replace(/\s+/g, '-')     // Reemplaza espacios con guiones
        .replace(/[^\w\-]+/g, '') // Borra caracteres raros (%, $, /, etc)
        .replace(/\-\-+/g, '-');  // Elimina guiones dobles
};