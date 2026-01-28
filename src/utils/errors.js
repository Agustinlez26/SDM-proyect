export class AppError extends Error {
    constructor(message, statusCode) {
        super(message)
        this.statusCode = statusCode
        this.status = `${statusCode}`.startsWith('4') ? 'error' : 'fail' 
        this.isOperational = true
    }
}

export class NotFoundError extends AppError{
    constructor(message = 'Recurso no encontrado'){
        super(message, 404)
    }
}

export class ValidationError extends AppError{
    constructor(message = 'Datos invalidos'){
        super(message, 400)
    }
}