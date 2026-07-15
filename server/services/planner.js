import { xpToLevel, xpToLevelFrom } from '../utils/xp.js';

/**
 * Works out which quests a player can start now, which are blocked, and a
 * suggested completion order.
 *
 * @param {{skills: Array<{name: string, level: number, xp: number}>}} player
 * @param {Array<object>} quests Quest definitions (as stored in data/quests.json).
 * @param {string[]} completedSlugs Slugs the player has already finished.
 */
export function buildPlan(player, quests, completedSlugs = []) {
  const completed = new Set(completedSlugs);
  const xpBySkill = new Map(player.skills.map((s) => [s.name, s.xp]));

  const questPoints = quests
    .filter((q) => completed.has(q.slug))
    .reduce((sum, q) => sum + q.questPoints, 0);

  const evaluated = quests.map((quest) =>
    evaluateQuest(quest, xpBySkill, completed, questPoints, quests)
  );

  return {
    questPoints,
    totalQuestPoints: quests.reduce((sum, q) => sum + q.questPoints, 0),
    completed: evaluated.filter((q) => q.status === 'completed'),
    eligible: evaluated.filter((q) => q.status === 'eligible'),
    blocked: evaluated.filter((q) => q.status === 'blocked'),
    suggestedOrder: suggestOrder(quests, xpBySkill, completed, questPoints)
  };
}

function evaluateQuest(quest, xpBySkill, completed, questPoints, allQuests) {
  const questsBySlug = new Map(allQuests.map((q) => [q.slug, q]));

  const missingSkills = Object.entries(quest.skillReqs ?? {})
    .map(([skill, required]) => {
      const xp = xpBySkill.get(skill) ?? 0;
      const level = xpToLevel(xp);
      if (level >= required) return null;
      return { skill, required, current: level, xpNeeded: xpToLevelFrom(xp, required) };
    })
    .filter(Boolean);

  const missingQuests = (quest.questReqs ?? [])
    .filter((slug) => !completed.has(slug))
    .map((slug) => ({ slug, name: questsBySlug.get(slug)?.name ?? slug }));

  const questPointsShort = Math.max(0, (quest.questPointsRequired ?? 0) - questPoints);

  const summary = {
    slug: quest.slug,
    name: quest.name,
    difficulty: quest.difficulty,
    members: quest.members,
    questPoints: quest.questPoints,
    xpRewards: quest.xpRewards ?? {},
    missingSkills,
    missingQuests,
    questPointsShort
  };

  if (completed.has(quest.slug)) {
    return { ...summary, status: 'completed' };
  }

  const blocked = missingSkills.length > 0 || missingQuests.length > 0 || questPointsShort > 0;
  return { ...summary, status: blocked ? 'blocked' : 'eligible' };
}

/**
 * Greedily walks the quest list, unlocking whatever is available and banking the
 * xp rewards, so later quests benefit from earlier ones. Quests that never
 * unlock (a skill grind is required) are left out of the route.
 */
function suggestOrder(quests, xpBySkill, completedSlugs, startingQuestPoints) {
  const xp = new Map(xpBySkill);
  const done = new Set(completedSlugs);
  const remaining = quests.filter((q) => !done.has(q.slug));
  const order = [];
  let questPoints = startingQuestPoints;

  let madeProgress = true;
  while (madeProgress && remaining.length > 0) {
    madeProgress = false;

    for (let i = 0; i < remaining.length; i++) {
      const quest = remaining[i];
      if (!isDoable(quest, xp, done, questPoints)) continue;

      remaining.splice(i, 1);
      i--;

      questPoints += quest.questPoints;
      order.push({ slug: quest.slug, name: quest.name, questPointsAfter: questPoints });
      done.add(quest.slug);

      for (const [skill, amount] of Object.entries(quest.xpRewards ?? {})) {
        xp.set(skill, (xp.get(skill) ?? 0) + amount);
      }
      madeProgress = true;
    }
  }

  return order;
}

function isDoable(quest, xp, done, questPoints) {
  if (questPoints < (quest.questPointsRequired ?? 0)) return false;
  if (!(quest.questReqs ?? []).every((slug) => done.has(slug))) return false;
  return Object.entries(quest.skillReqs ?? {}).every(
    ([skill, required]) => xpToLevel(xp.get(skill) ?? 0) >= required
  );
}
