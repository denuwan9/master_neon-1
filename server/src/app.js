const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const neonRequestRoutes = require('./routes/neonRequestRoutes')
const contactRoutes = require('./routes/contactRoutes')
const { notFound, errorHandler } = require('./middleware/errorHandler')

const app = express()

const allowedOrigins = process.env.ALLOW_ORIGINS ? process.env.ALLOW_ORIGINS.split(',') : '*'
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
)
// Allow larger payloads (client may send base64-encoded PDFs/images).
// Increase limits to accommodate larger design payloads. Adjust if needed.
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(morgan('dev'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/neon-request', neonRequestRoutes)
app.use('/api/contact', contactRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
