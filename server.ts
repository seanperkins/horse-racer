import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { WebSocketServer } from 'ws'
import { setupWebSocketServer } from './server/websocket-handler'
import { getUserFromRequest } from './server/auth-helper'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

// Initialize Next.js
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Create WebSocket server on the same HTTP server
  // Use noServer: true to handle upgrade manually
  const wss = new WebSocketServer({
    noServer: true
  })

  // Set up WebSocket handlers
  setupWebSocketServer(wss)

  // Handle WebSocket upgrade requests
  server.on('upgrade', async (request, socket, head) => {
    const { pathname } = parse(request.url || '', true)

    // Handle our custom WebSocket connections
    if (pathname === '/ws') {
      // Extract authenticated user from session cookie
      const user = await getUserFromRequest(request)

      wss.handleUpgrade(request, socket, head, (ws) => {
        // Pass user info to WebSocket connection handler
        wss.emit('connection', ws, request, user)
      })
    }
    // For HMR and other requests, do nothing - Next.js handles them internally
    // Don't destroy the socket, just let Next.js's internal upgrade handler process it
  })

  server.once('error', (err) => {
    console.error(err)
    process.exit(1)
  })

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket server listening on ws://${hostname}:${port}/ws`)
  })

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutdown signal received: closing connections')

    // Close all WebSocket connections
    wss.clients.forEach((ws) => {
      ws.close(1000, 'Server shutting down')
    })

    // Close the HTTP server
    server.close(() => {
      console.log('HTTP server closed')
      process.exit(0)
    })

    // Force exit after 5 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('Forced shutdown after timeout')
      process.exit(1)
    }, 5000)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
})
