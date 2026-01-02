import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { WebSocketServer } from 'ws'
import { setupWebSocketServer } from './server/websocket-handler'

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
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '', true)

    // Handle our custom WebSocket connections
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    }
    // Let Next.js handle its own HMR WebSocket connections
    else if (pathname?.startsWith('/_next/webpack-hmr')) {
      // Next.js will handle this internally
      // We just need to not interfere
    }
    // Destroy any other upgrade requests
    else {
      socket.destroy()
    }
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
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server')
    server.close(() => {
      console.log('HTTP server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server')
    server.close(() => {
      console.log('HTTP server closed')
      process.exit(0)
    })
  })
})
