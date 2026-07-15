import { Router } from 'express';
import { prisma } from '../db.js';
import { fetchPlayerStats, normaliseRsn, normaliseMode } from '../services/hiscores.js';
import { buildPlan } from '../services/planner.js';
import { upsertPlayer, serialisePlayer } from './player.js';

const router = Router();

/**
 * GET /api/plan/:rsn?mode=main
 * Fetches the player, loads the quest list, and returns what they can do next.
 */
router.get('/:rsn', async (req, res, next) => {
  try {
    const rsn = normaliseRsn(req.params.rsn);
    const mode = normaliseMode(req.query.mode);

    const stats = await fetchPlayerStats(rsn, mode);
    const player = await upsertPlayer(stats);

    const [quests, completions] = await Promise.all([
      prisma.quest.findMany({ orderBy: { id: 'asc' } }),
      prisma.questCompletion.findMany({
        where: { playerId: player.id },
        include: { quest: true }
      })
    ]);

    if (quests.length === 0) {
      return res.status(503).json({
        error: 'No quests in the database yet. Run `npm run seed` in the server folder.'
      });
    }

    const completedSlugs = completions.map((c) => c.quest.slug);
    const plan = buildPlan(stats, quests, completedSlugs);

    res.json({ player: serialisePlayer(player), plan });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/plan/:rsn/complete  { "slug": "cooks-assistant", "completed": true }
 * Marks a quest as done (or undone) for a player so the plan accounts for it.
 */
router.post('/:rsn/complete', async (req, res, next) => {
  try {
    const rsn = normaliseRsn(req.params.rsn);
    const { slug, completed = true } = req.body ?? {};
    if (!slug) return res.status(400).json({ error: 'A quest `slug` is required.' });

    const [player, quest] = await Promise.all([
      prisma.player.findUnique({ where: { rsn: rsn.toLowerCase() } }),
      prisma.quest.findUnique({ where: { slug } })
    ]);

    if (!player) {
      return res.status(404).json({ error: 'Look that player up first via /api/player/:rsn.' });
    }
    if (!quest) return res.status(404).json({ error: `Unknown quest "${slug}".` });

    if (completed) {
      await prisma.questCompletion.upsert({
        where: { playerId_questId: { playerId: player.id, questId: quest.id } },
        create: { playerId: player.id, questId: quest.id },
        update: {}
      });
    } else {
      await prisma.questCompletion.deleteMany({
        where: { playerId: player.id, questId: quest.id }
      });
    }

    res.json({ slug, completed: Boolean(completed) });
  } catch (err) {
    next(err);
  }
});

/** GET /api/plan/ — the raw quest list, handy for debugging the seed. */
router.get('/', async (_req, res, next) => {
  try {
    res.json(await prisma.quest.findMany({ orderBy: { id: 'asc' } }));
  } catch (err) {
    next(err);
  }
});

export default router;
