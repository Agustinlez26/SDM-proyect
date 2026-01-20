import express from 'express'
const PORT = process.env.PORT ?? 1234
const app = express()

app.disable('x-powered-by')

app.listen(PORT, () => {
    console.log(`App listen in http://localhost:${PORT}`)
})