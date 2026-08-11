import express from 'express'
import cors from 'cors'
import playerRouter from './routes/player.js'
import planRouter from './routes/plan.js'
import trainRouter from './routes/train.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'osrs-planner-api' })
})

app.use('/api/train', trainRouter)
app.use('/api/player', playerRouter)
app.use('/api/plan', planRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
