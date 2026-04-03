require('dotenv').config()
const express = require('express')
const path = require('path')
const { connectToMongoDB } = require('./database')

const app = express()
app.use(express.json())

const router = require('./routes')
app.use('/api', router)

const clientDistPath = path.join(__dirname, '../client/dist')
app.use(express.static(clientDistPath))

// Serve the React app for all non-API routes in production.
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'))
})

const port = process.env.PORT || 5000

const startServer = async () => {
  try {
    await connectToMongoDB()
    app.listen(port, () => {
      console.log(`Server is listening on http://localhost:${port}`)
    })
  } catch (error) {
    console.error('Failed to connect to MongoDB. Server not started.')
  }
}

startServer()
