import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'foxer-backend', version: '0.1.0' })
})

// TODO: mount routes
// app.use('/api/auth', authRouter)
// app.use('/api/courses', coursesRouter)
// app.use('/api/lessons', lessonsRouter)
// app.use('/api/quizzes', quizzesRouter)
// app.use('/api/progress', progressRouter)
// app.use('/api/users', usersRouter)
// app.use('/api/enrollments', enrollmentsRouter)
// app.use('/api/products', productsRouter)

app.listen(PORT, () => {
  console.log(`🦊 foxer-backend running on port ${PORT}`)
})

export default app
