import dotenv from 'dotenv'
dotenv.config()

import app from './app'

const PORT = parseInt(process.env.PORT || '3001', 10)

app.listen(PORT, () => {
  console.log(`🦊 foxer-backend running on port ${PORT}`)
  console.log(`📖 API docs: http://localhost:${PORT}/docs`)
})
