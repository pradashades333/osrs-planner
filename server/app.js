import express from 'express'
import cors from 'cors'
import playerRouter from './routes/player.js'
import planRouter from './routes/plan.js'
import trainRouter from './routes/train.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use('/api/train', trainRouter)
app.use('/api/player', playerRouter)
app.use('/api/plan', planRouter)

export default app
