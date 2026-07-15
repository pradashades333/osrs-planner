import { Router } from 'express';
import { prisma } from '../db.js';
import { fetchPlayerStats, normaliseRsn, normaliseMode, HiscoresError } from '../services/hiscores.js';
import { xpToNextLevel, levelProgress } from '../utils/xp.js';

const router = Router();

/** Re-fetch from the hiscores if our copy is older than this. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * GET /api/player/:rsn?mode=main&refresh=true
 * Returns the player's stats, fetching from the hiscores and caching in Postgres.
 */
router.get('/:rsn', async (req, res, next) => {
  try {
    // Validate before querying, so junk input costs a 400 rather than a round trip.
    const rsn = normaliseRsn(req.params.rsn);
    const mode = normaliseMode(req.query.mode);
    const forceRefresh = req.query.refresh === 'true';

    const cached = await prisma.player.findUnique({
      where: { rsn: rsn.toLowerCase() },
      include: { skills: true }
    });

    const isFresh =
      cached && !forceRefresh && Date.now() - cached.updatedAt.getTime() < CACHE_TTL_MS;

    if (isFresh) {
      return res.json({ ...serialisePlayer(cached), cached: true });
    }

    const stats = await fetchPlayerStats(rsn, mode);
    const saved = await upsertPlayer(stats);
    res.json({ ...serialisePlayer(saved), cached: false });
  } catch (err) {
    next(err);
  }
});

/** Writes a freshly fetched stats payload to Postgres, replacing the old skill rows. */
export async function upsertPlayer(stats) {
  const key = stats.rsn.toLowerCase();

  return prisma.player.upsert({
    where: { rsn: key },
    create: {
      rsn: key,
      mode: stats.mode,
      totalLevel: stats.totalLevel,
      totalXp: BigInt(stats.totalXp),
      skills: { create: stats.skills }
    },
    update: {
      mode: stats.mode,
      totalLevel: stats.totalLevel,
      totalXp: BigInt(stats.totalXp),
      // Simplest correct thing: drop the old snapshot and write the new one.
      skills: { deleteMany: {}, create: stats.skills }
    },
    include: { skills: true }
  });
}

/** Shapes a Player row (plus skills) into the JSON the client expects. */
export function serialisePlayer(player) {
  return {
    rsn: player.rsn,
    mode: player.mode,
    totalLevel: player.totalLevel,
    totalXp: Number(player.totalXp),
    updatedAt: player.updatedAt,
    skills: player.skills
      .map((s) => ({
        name: s.name,
        level: s.level,
        xp: s.xp,
        rank: s.rank,
        xpToNextLevel: xpToNextLevel(s.xp),
        progress: levelProgress(s.xp)
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  };
}

export { HiscoresError };
export default router;
