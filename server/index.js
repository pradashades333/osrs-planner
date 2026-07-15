import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import playerRoutes from './routes/player.js';
import planRoutes from './routes/plan.js';
import { HiscoresError } from './services/hiscores.js';

// Prisma returns BigInt for Player.totalXp, which JSON.stringify refuses to
// serialise. Render it as a plain number instead of throwing.
BigInt.prototype.toJSON = function toJSON() {
  return Number(this);
};

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/player', playerRoutes);
app.use('/api/plan', planRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
app.use((err, _req, res, _next) => {
  if (err instanceof HiscoresError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`OSRS planner API listening on http://localhost:${PORT}`);
});
