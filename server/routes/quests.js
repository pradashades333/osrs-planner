import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// GET /api/quests
// Lightweight list of every seeded quest for the goal picker. Sorted by
// difficulty tier then name so the dropdown reads naturally.
const DIFFICULTY_ORDER = {
  Novice: 0,
  Intermediate: 1,
  Experienced: 2,
  Master: 3,
  Grandmaster: 4,
  Special: 5,
};

router.get('/', async (_req, res) => {
  try {
    const quests = await prisma.quest.findMany({
      select: {
        slug: true,
        name: true,
        difficulty: true,
        members: true,
        skillReqs: true,
        questReqs: true,
        xpRewards: true,
      },
    });

    quests.sort((a, b) => {
      const da = DIFFICULTY_ORDER[a.difficulty] ?? 99;
      const db = DIFFICULTY_ORDER[b.difficulty] ?? 99;
      return da - db || a.name.localeCompare(b.name);
    });

    res.json({ quests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
