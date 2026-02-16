import 'dotenv/config'
import express from 'express'
import routes from './routes/index.js'
import path from 'path'
import cookieParser from 'cookie-parser'
const PORT = process.env.PORT ?? 1234
const app = express()

app.disable('x-powered-by')

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use('/', routes)

app.set('view engine', 'ejs')
app.set('views', path.join(process.cwd(), 'src', 'public', 'views'))
app.use(express.static('src/public'))

app.listen(PORT, () => {
    console.log(`App listen in http://localhost:${PORT}`)
})