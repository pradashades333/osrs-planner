import express from 'express'
import cors from 'cors'
import playerRouter from './routes/player.js'
import planRouter from './routes/plan.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/player', playerRouter)
app.use('/api/plan', planRouter)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
