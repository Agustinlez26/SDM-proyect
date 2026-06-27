import 'dotenv/config'
import express from 'express'
import routes from './routes/index.js'
import path from 'path'
import cookieParser from 'cookie-parser'
import { createServer } from 'node:http'
import crypto from 'node:crypto'
import { Server } from 'socket.io'
import { checkAuth, requirePasswordChange } from './src/middlewares/auth-middleware.js'
import { apiLimiter, viewsLimiter } from './src/middlewares/rate-limit-middleware.js';
import { verifySameOriginApiRequest } from './src/middlewares/origin-middleware.js';
import helmet from 'helmet'

const PORT = process.env.PORT ?? 1234
const app = express()

const httpServer = createServer(app)

const configuredOrigin = process.env.APP_ORIGIN
const allowedOrigin = process.env.NODE_ENV === 'production'
    ? (configuredOrigin ?? 'https://soldemayoadmin.com')
    : (configuredOrigin ?? `http://localhost:${PORT}`);
const io = new Server(httpServer, {
    cors: { origin: allowedOrigin }
})

app.set('io', io)

app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64')
    next()
})

app.use(helmet({

    hsts: process.env.NODE_ENV === 'production' ? true : false,

    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],

            scriptSrc: [
                "'self'",
                (req, res) => `'nonce-${res.locals.cspNonce}'`,
                "https://cdn.jsdelivr.net"
            ],

            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://cdn.jsdelivr.net"
            ],

            scriptSrcAttr: [
                "'unsafe-inline'",
            ],

            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https:"
            ],

            connectSrc: [
                "'self'",
                "ws:",
                "wss:",
                "https://cdn.jsdelivr.net"
            ],

            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com"
            ],
        }
    },
    crossOriginEmbedderPolicy: false
}));

let requestCounter = 0;
app.use((req, res, next) => {
    requestCounter++;
    console.log(`[Petición #${requestCounter}] ${req.method} ${req.originalUrl}`);
    next();
});

app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

const publicDir = path.join(process.cwd(), 'src', 'public')
app.use('/css', express.static(path.join(publicDir, 'css')))
app.use('/js', express.static(path.join(publicDir, 'js')))
app.use('/imgs', express.static(path.join(publicDir, 'imgs')))
app.use('/img', express.static(path.join(publicDir, 'imgs')))
app.use('/uploads', express.static(path.join(publicDir, 'uploads')))
app.use('/api', apiLimiter);

app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }

    if (req.path.match(/\.(js|css|png|jpg|jpeg|ico|svg|map)$/i)) {
        return next();
    }

    return viewsLimiter(req, res, next);
});

app.use(verifySameOriginApiRequest)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(cookieParser())
app.use('/views', (req, res) => res.sendStatus(404))
app.use('/', routes)

app.set('view engine', 'ejs')
app.set('views', path.join(process.cwd(), 'src', 'views'))

app.use(checkAuth, requirePasswordChange, (req, res) => {
    res.redirect('/')
})

httpServer.listen(PORT, () => {
    console.log(`App y WebSockets corriendo en el puerto: ${PORT}`)
})
