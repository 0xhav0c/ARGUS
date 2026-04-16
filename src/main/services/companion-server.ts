import { createServer, type Server, type IncomingMessage } from 'http'
import { networkInterfaces } from 'os'
import { randomBytes, randomUUID } from 'crypto'
import type { Incident } from '../../shared/types'

interface CompanionClient {
  id: string
  send: (data: string) => void
  close: () => void
}

export class CompanionServer {
  private server: Server | null = null
  private clients: CompanionClient[] = []
  private port = 9147
  private running = false
  private authToken: string = randomBytes(24).toString('hex')

  getLocalIP(): string {
    const nets = networkInterfaces()
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) return net.address
      }
    }
    return '127.0.0.1'
  }

  getAuthToken(): string {
    return this.authToken
  }

  private isAuthorized(req: IncomingMessage): boolean {
    const authHeader = req.headers.authorization
    return authHeader === `Bearer ${this.authToken}`
  }

  start(): Promise<{ port: number; ip: string }> {
    return new Promise((resolve, reject) => {
      if (this.running) {
        resolve({ port: this.port, ip: this.getLocalIP() })
        return
      }

      this.server = createServer((req, res) => {
        const origin = req.headers.origin
        if (origin) {
          try {
            const h = new URL(origin).hostname
            if (h === 'localhost' || h === '127.0.0.1') {
              res.setHeader('Access-Control-Allow-Origin', origin)
            }
          } catch {}
        }
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('X-Frame-Options', 'DENY')

        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Methods', 'GET')
          res.setHeader('Access-Control-Allow-Headers', 'Authorization')
          res.writeHead(204)
          res.end()
          return
        }

        if (!this.isAuthorized(req)) {
          res.writeHead(401)
          res.end(JSON.stringify({ error: 'Unauthorized. Provide token via Authorization: Bearer <token> header.' }))
          return
        }

        if (req.url === '/status') {
          res.writeHead(200)
          res.end(JSON.stringify({ app: 'Argus', status: 'running', clients: this.clients.length }))
          return
        }

        if (req.url?.startsWith('/api/incidents') && req.method === 'GET') {
          res.writeHead(200)
          res.end(JSON.stringify({ ok: true, message: 'Connect via SSE at /events for real-time updates' }))
          return
        }

        if (req.url?.startsWith('/events')) {
          this.handleSSE(req, res)
          return
        }

        res.writeHead(404)
        res.end(JSON.stringify({ error: 'Not found' }))
      })

      this.server.listen(this.port, '127.0.0.1', () => {
        this.running = true
        const ip = this.getLocalIP()
        console.log(`[Companion] Server started at http://127.0.0.1:${this.port}`)
        resolve({ port: this.port, ip })
      })

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          this.port++
          this.server?.close()
          this.start().then(resolve).catch(reject)
        } else {
          reject(err)
        }
      })
    })
  }

  private handleSSE(_req: IncomingMessage, res: any): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const clientId = randomUUID()
    const client: CompanionClient = {
      id: clientId,
      send: (data: string) => {
        try { res.write(`data: ${data}\n\n`) } catch {}
      },
      close: () => {
        try { res.end() } catch {}
      },
    }

    this.clients.push(client)
    console.log(`[Companion] Client connected: ${clientId} (total: ${this.clients.length})`)

    client.send(JSON.stringify({ type: 'connected', clientId, timestamp: new Date().toISOString() }))

    res.on('close', () => {
      this.clients = this.clients.filter(c => c.id !== clientId)
      console.log(`[Companion] Client disconnected: ${clientId} (total: ${this.clients.length})`)
    })
  }

  pushIncident(incident: Incident): void {
    if (this.clients.length === 0) return
    const payload = JSON.stringify({
      type: 'incident',
      data: {
        id: incident.id,
        title: incident.title,
        domain: incident.domain,
        severity: incident.severity,
        country: incident.country,
        timestamp: incident.timestamp,
        source: incident.source,
      },
    })
    for (const client of this.clients) {
      client.send(payload)
    }
  }

  pushAlert(message: string, severity: string): void {
    if (this.clients.length === 0) return
    const payload = JSON.stringify({
      type: 'alert',
      data: { message, severity, timestamp: new Date().toISOString() },
    })
    for (const client of this.clients) {
      client.send(payload)
    }
  }

  getClientCount(): number {
    return this.clients.length
  }

  getConnectionInfo(): { ip: string; port: number; running: boolean; clients: number; tokenPreview: string } {
    return {
      ip: this.getLocalIP(),
      port: this.port,
      running: this.running,
      clients: this.clients.length,
      tokenPreview: this.authToken ? `${this.authToken.slice(0, 6)}••••` : '',
    }
  }

  stop(): void {
    for (const client of this.clients) client.close()
    this.clients = []
    this.server?.close()
    this.running = false
  }
}
