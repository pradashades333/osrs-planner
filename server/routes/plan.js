import { Router } from 'express';
import { prisma } from '../db.js';
import { buildPlan, parseGoalText } from '../services/planner.js';

const router = Router();

// POST /api/plan/:rsn
// body: { goals: [ { type: "skill", skill, target } | { type: "quest", slug } ] }
// Returns one unified plan across every goal: per-skill XP + time, quest
// blockers, and combined totals.
router.post('/:rsn', async (req, res) => {
  const rsn = req.params.rsn;
  try {
    const player = await prisma.player.findUnique({
      where: { rsn: rsn.toLowerCase() },
      include: { skills: true },
    });

    if (!player) {
      return res.status(404).json({
        error: 'Player not found. Hit /api/player/:rsn first to load their stats.',
      });
    }

    const quests = await prisma.quest.findMany();
    const questsBySlug = new Map(quests.map((q) => [q.slug, q]));
    let goals = Array.isArray(req.body?.goals) ? req.body.goals : null;

    if (!goals && req.body?.text) {
      const parsed = parseGoalText(req.body.text, questsBySlug);
      if (parsed.errors.length) {
        return res.status(400).json({ error: parsed.errors.join(' ') });
      }
      goals = parsed.goals;
    }

    if (!goals || goals.length === 0) {
      return res.status(400).json({
        error: 'Provide goal text such as "70 ranged AND Monkey Madness II".',
      });
    }

    for (const goal of goals) {
      if (goal.type === 'skill') {
        const target = Number(goal.target);
        if (!goal.skill || !Number.isInteger(target) || target < 1 || target > 99) {
          return res.status(400).json({
            error: `Invalid skill goal: ${JSON.stringify(goal)}. Needs skill and target 1-99.`,
          });
        }
        goal.skill = goal.skill.toLowerCase();
        goal.target = target;
      } else if (goal.type === 'quest') {
        if (!goal.slug) {
          return res.status(400).json({ error: 'Quest goal needs a slug.' });
        }
      } else {
        return res.status(400).json({ error: `Unknown goal type: ${goal.type}` });
      }
    }

    // Fetch every method for the skills we might touch, grouped once up front.
    const allMethods = await prisma.trainingMethod.findMany();
    const methodsBySkill = new Map();
    for (const m of allMethods) {
      const key = m.skill.toLowerCase();
      if (!methodsBySkill.has(key)) methodsBySkill.set(key, []);
      methodsBySkill.get(key).push(m);
    }

    const plan = buildPlan({
      playerSkills: player.skills,
      goals,
      questsBySlug,
      methodsForSkill: (skill) => methodsBySkill.get(skill) ?? [],
    });

    res.json({ rsn: player.rsn, input: req.body?.text ?? null, ...plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
