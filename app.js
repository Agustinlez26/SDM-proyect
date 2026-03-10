import 'dotenv/config'
import express from 'express'
import routes from './routes/index.js'
import path from 'path'
import cookieParser from 'cookie-parser'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { checkAuth, requirePasswordChange } from './src/middlewares/auth-middleware.js'
import { apiLimiter, viewsLimiter } from './src/middlewares/rate-limit-middleware.js';
import helmet from 'helmet'

const PORT = process.env.PORT ?? 1234
const app = express()

const httpServer = createServer(app)

const allowedOrigin = process.env.NODE_ENV === 'production' ? 'https://soldemayoadmin.com' : '*';
const io = new Server(httpServer, {
    cors: { origin: allowedOrigin }
})

app.set('io', io)

io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado vía WebSocket: ${socket.id}`)

    socket.on('disconnect', () => {
        console.log(`🔴 Cliente desconectado: ${socket.id}`)
    })
})

app.use(helmet({

    hsts: process.env.NODE_ENV === 'production' ? true : false,

    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],

            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
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

app.set('trust proxy', 1);

app.use(express.static(path.join(process.cwd(), 'src', 'public')));
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

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(cookieParser())
app.use('/', routes)

app.set('view engine', 'ejs')
app.set('views', path.join(process.cwd(), 'src', 'public', 'views'))
app.use(express.static('src/public'))

app.use(checkAuth, requirePasswordChange, (req, res) => {
    res.redirect('/')
})

httpServer.listen(PORT, () => {
    console.log(`🚀 App y WebSockets corriendo en http://localhost:${PORT}`)
})