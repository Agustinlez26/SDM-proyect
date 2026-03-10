import rateLimit from 'express-rate-limit';

export const viewsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Has recargado la página demasiadas veces. Por favor, espera unos minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});

export const loginViewLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Has recargado la página demasiadas veces. Por favor, espera unos minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { status: 'error', message: 'Demasiadas peticiones a la API. Intenta más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: { status: 'error', message: 'Demasiados intentos fallidos. Tu acceso ha sido bloqueado por 10 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});
