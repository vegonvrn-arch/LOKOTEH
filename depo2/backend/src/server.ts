import express, { Express } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initializeDatabase } from './db/init.js'
import authRoutes from './routes/auth.js'
import projectsRoutes from './routes/projects.js'
import segmentsRoutes from './routes/segments.js'
import polylinesRoutes from './routes/polylines.js'
import wheelPolylinesRoutes from './routes/wheelPolylines.js'

dotenv.config()

const app: Express = express()
const port = process.env.SERVER_PORT || 3001

// Middleware
app.use(express.json())
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
)

// Initialize database on startup
async function startServer() {
  try {
    await initializeDatabase()
    console.log('✓ Database initialized')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    process.exit(1)
  }

  // Routes
  app.use('/api/auth', authRoutes)
  app.use('/api/projects', projectsRoutes)
  app.use('/api/projects/:projectId/segments', segmentsRoutes)
  app.use('/api/projects/:projectId/polylines', polylinesRoutes)
  app.use('/api/projects/:projectId/wheel-polylines', wheelPolylinesRoutes)

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Error:', err)
    res.status(500).json({ error: 'Internal server error' })
  })

  app.listen(port, () => {
    console.log(`✓ Server running on http://localhost:${port}`)
    console.log(`✓ API documentation:`)
    console.log(`  - Auth: POST /api/auth/register, POST /api/auth/login`)
    console.log(`  - Projects: GET /api/projects, POST /api/projects`)
    console.log(`  - Segments: GET /api/projects/:projectId/segments`)
    console.log(`  - Polylines: GET /api/projects/:projectId/polylines`)
    console.log(`  - Wheel Polylines: GET /api/projects/:projectId/wheel-polylines`)
  })
}

startServer().catch(console.error)
