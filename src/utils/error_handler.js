/**
 * Manejador centralizado de errores HTTP.
 * @param {import('express').Response} res - Objeto de respuesta de Express.
 * @param {Error} error - Objeto de error capturado.
 */
export const handleError = (res, error) => {
    if (error.statusCode) {
        return res.status(error.statusCode).json({
            status: 'error',
            message: error.message
        })
    }

    if (error.name === 'ValidationError') {
        return res.status(400).json({ status: 'error', message: error.message })
    }

    if (error.name === 'NotFoundError') {
        return res.status(404).json({ status: 'error', message: error.message })
    }

    console.error("[Critical Error]:", error)

    return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor'
    })
}