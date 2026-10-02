require('dotenv').config({ quiet: true })
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const { connectToMongoDB } = require('./database')
const { ensureIndexes } = require('./models/index')

const app = express()
// Render sits behind a proxy, so trust it for the real client IP and HTTPS.
app.set('trust proxy', 1)
app.disable('x-powered-by')

// Basic security headers for every response.
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  })
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
  next()
})

app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

const router = require('./routes')
app.use('/api', router)

app.use('/api', (req, res) => {
  res.status(404).json({ mssg: 'Not found' })
})

// Return JSON instead of an HTML error page when an API route throws.
app.use('/api', (err, req, res, next) => {
  const status = err.status || 500
  if (status >= 500) console.error(err)
  res.status(status).json({ mssg: status >= 500 ? 'Something went wrong' : err.message })
})

const clientDistPath = path.join(__dirname, '../client/dist')

// Built files in /assets have a content hash in their name, so they can be cached for a long time.
// Everything else (index.html, the service worker, the manifest) must always be checked for updates.
app.use(express.static(clientDistPath, {
  setHeaders: (res, filePath) => {
    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable')
    } else {
      res.set('Cache-Control', 'no-cache')
    }
  },
}))

// Serve the React app for all non-API routes in production.
app.get(/^\/(?!api).*/, (req, res) => {
  res.set('Cache-Control', 'no-cache')
  res.sendFile(path.join(clientDistPath, 'index.html'))
})

const port = process.env.PORT || 5000

const startServer = async () => {
  try {
    await connectToMongoDB()
    await ensureIndexes()
    app.listen(port, () => {
      console.log(`Server is listening on http://localhost:${port}`)
      if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        console.log('No GEMINI_API_KEY (or ANTHROPIC_API_KEY) is set, so the AI features are turned off.')
      }
    })
  } catch (error) {
    console.error('Failed to connect to MongoDB. Server not started.', error)
  }
}

startServer()
