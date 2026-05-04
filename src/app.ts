import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import YAML from 'yamljs'
import swaggerUi from 'swagger-ui-express'
import path from 'path'

import { errorHandler } from './middleware/errorHandler'
import authRoutes from './services/auth/auth.routes'
import usersRoutes from './services/users/users.routes'
import trackingRoutes from './services/tracking/tracking.routes'
import coursesRoutes from './services/courses/courses.routes'
import lessonsRoutes from './services/lessons/lessons.routes'
import quizzesRoutes from './services/quizzes/quizzes.routes'
import progressRoutes from './services/progress/progress.routes'
import enrollmentsRoutes from './services/enrollments/enrollments.routes'
import productsRoutes from './services/products/products.routes'

const app = express()

// ── Security & logging ──────────────────────────────────────
app.use(helmet())
app.use(morgan('combined'))

// ── CORS ────────────────────────────────────────────────────
const allowedOrigins = [
  'https://foxer.fi',
  'https://ilkkavesa.github.io',   // foxer-web on GH Pages
  process.env.CORS_ORIGIN,
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile app / curl)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))

// ── Rate limiting ───────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too Many Requests', message: 'Rate limit exceeded — try again later' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too Many Requests', message: 'Too many auth attempts' },
})

app.use(limiter)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false }))

// ── Swagger UI ──────────────────────────────────────────────
try {
  const swaggerDoc = YAML.load(path.join(__dirname, '../docs/openapi.yaml'))
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc))
} catch {
  console.warn('⚠ openapi.yaml not found — Swagger UI disabled')
}

// ── Health ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'foxer-backend', version: '0.2.0' })
})

// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth',        authLimiter, authRoutes)
app.use('/api/users',       usersRoutes)
app.use('/api/tracking',    trackingRoutes)
app.use('/api/courses',     coursesRoutes)
app.use('/api/lessons',     lessonsRoutes)
app.use('/api/quizzes',     quizzesRoutes)
app.use('/api/progress',    progressRoutes)
app.use('/api/enrollments', enrollmentsRoutes)
app.use('/api/products',    productsRoutes)

// ── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Route not found' })
})

// ── Global error handler ─────────────────────────────────────
app.use(errorHandler)

export default app
