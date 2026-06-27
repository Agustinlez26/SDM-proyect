const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TRUSTED_FETCH_SITES = new Set(['same-origin', 'same-site', 'none']);
const PRODUCTION_ORIGIN = 'https://soldemayoadmin.com';

export const verifySameOriginApiRequest = (req, res, next) => {
    if (SAFE_METHODS.has(req.method) || !req.path.startsWith('/api')) {
        return next();
    }

    const fetchSite = req.get('sec-fetch-site');
    if (fetchSite && !TRUSTED_FETCH_SITES.has(fetchSite)) {
        return res.status(403).json({
            status: 'error',
            message: 'Solicitud rechazada por origen no permitido'
        });
    }

    const origin = req.get('origin');
    const expectedOrigin = `${req.protocol}://${req.get('host')}`;
    const configuredOrigin = process.env.APP_ORIGIN
        ?? (process.env.NODE_ENV === 'production' ? PRODUCTION_ORIGIN : null);
    const allowedOrigins = [expectedOrigin, configuredOrigin].filter(Boolean);

    if (origin && !allowedOrigins.includes(origin)) {
        return res.status(403).json({
            status: 'error',
            message: 'Solicitud rechazada por origen no permitido'
        });
    }

    if (!origin && !fetchSite) {
        return res.status(403).json({
            status: 'error',
            message: 'Solicitud rechazada por falta de cabeceras de origen'
        });
    }

    return next();
};
