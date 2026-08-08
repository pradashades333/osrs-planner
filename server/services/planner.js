import { xpTable } from '../data/xpTable.js';

// The planner is deliberately DB-free: it takes plain data in and returns a
// plain plan out. The routes fetch from Prisma and hand the rows to these
// functions, which keeps the interesting logic easy to reason about and test.

export const MAX_LEVEL = 99;

const SKILL_ALIASES = new Map([
  ['runecrafting', 'runecraft'],
  ['hp', 'hitpoints'],
  ['defense', 'defence'],
]);

const ROMAN_NUMERALS = new Map([
  ['1', 'i'],
  ['2', 'ii'],
  ['3', 'iii'],
  ['4', 'iv'],
]);

function normaliseWords(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\b([1-4])\b/g, (_, numeral) => ROMAN_NUMERALS.get(numeral))
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Turn a readable goal string into the same goal objects used by the API.
 * Examples: "70 ranged AND 80 mining AND Monkey Madness 2".
 */
export function parseGoalText(text, questsBySlug) {
  const parts = String(text ?? '')
    .split(/\s+(?:and)\s+|\s*,\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
  const goals = [];
  const errors = [];

  const questsByName = new Map(
    [...questsBySlug.values()].map((quest) => [normaliseWords(quest.name), quest])
  );

  for (const part of parts) {
    const skillMatch = part.match(/^(\d{1,2})\s+([a-z ]+)$/i);
    if (skillMatch) {
      const target = Number(skillMatch[1]);
      const enteredSkill = normaliseWords(skillMatch[2]).replace(/\s+/g, '');
      const skill = SKILL_ALIASES.get(enteredSkill) ?? enteredSkill;
      if (target >= 1 && target <= MAX_LEVEL) {
        goals.push({ type: 'skill', skill, target });
        continue;
      }
    }

    const quest = questsByName.get(normaliseWords(part));
    if (quest) {
      goals.push({ type: 'quest', slug: quest.slug });
    } else {
      errors.push(`Couldn't recognise "${part}".`);
    }
  }

  return { goals, errors };
}

/** XP required to reach a given level (xpTable is indexed by level). */
export function xpForLevel(level) {
  const clamped = Math.max(1, Math.min(MAX_LEVEL, level));
  return xpTable[clamped];
}

/** Highest level a given amount of XP has earned. */
export function levelForXp(xp) {
  let level = 1;
  while (level < MAX_LEVEL && xpTable[level + 1] <= xp) level += 1;
  return level;
}

/**
 * Walk a quest's prerequisite chain and return every quest that must be
 * completed first, including the target itself. Guards against cycles and
 * prerequisites that were never seeded.
 */
export function resolveQuestChain(startSlugs, questsBySlug) {
  const seen = new Set();
  const missing = new Set();
  const stack = [...startSlugs];

  while (stack.length) {
    const slug = stack.pop();
    if (seen.has(slug)) continue;

    const quest = questsBySlug.get(slug);
    if (!quest) {
      missing.add(slug);
      continue;
    }
    seen.add(slug);
    for (const req of quest.questReqs || []) stack.push(req);
  }

  return { slugs: seen, missing };
}

/**
 * Return a dependency-safe order for quest completion: each prerequisite
 * appears before the quest which needs it. A cycle is surfaced rather than
 * silently returning an invalid order.
 */
export function orderQuestPath(startSlugs, questsBySlug) {
  const visiting = new Set();
  const visited = new Set();
  const order = [];
  const cycles = [];

  const visit = (slug) => {
    if (visited.has(slug) || !questsBySlug.has(slug)) return;
    if (visiting.has(slug)) {
      cycles.push(slug);
      return;
    }

    visiting.add(slug);
    const quest = questsBySlug.get(slug);
    for (const prereq of quest.questReqs || []) visit(prereq);
    visiting.delete(slug);
    visited.add(slug);
    order.push(quest);
  };

  for (const slug of startSlugs) visit(slug);
  return { order, cycles };
}

/**
 * Merge explicit skill goals and quest skill requirements into a single
 * required-level-per-skill map. When two goals touch the same skill, the
 * higher level wins.
 */
export function mergeRequiredLevels(goals, questsBySlug) {
  const required = new Map();
  const questSlugs = new Set();

  const bump = (skill, level) => {
    const key = skill.toLowerCase();
    required.set(key, Math.max(required.get(key) ?? 0, level));
  };

  for (const goal of goals) {
    if (goal.type === 'skill') {
      bump(goal.skill, goal.target);
    } else if (goal.type === 'quest') {
      questSlugs.add(goal.slug);
    }
  }

  const { slugs, missing } = resolveQuestChain(questSlugs, questsBySlug);
  for (const slug of slugs) {
    const quest = questsBySlug.get(slug);
    for (const [skill, level] of Object.entries(quest.skillReqs || {})) {
      bump(skill, level);
    }
  }

  return { required, questSlugs: slugs, missingQuests: missing };
}

/**
 * Estimate the hours to train a skill from one XP value to a target level by
 * walking the level range and, at each step, using the fastest method that is
 * valid at the current level. Returns { hours, gpCost, segments } or a null
 * estimate when no method covers part of the range.
 */
export function estimateSkillTime(currentXp, targetLevel, methods) {
  const startLevel = levelForXp(currentXp);
  if (targetLevel <= startLevel) {
    return { hours: 0, gpCost: 0, segments: [], covered: true };
  }

  const segments = [];
  let level = startLevel;
  let xp = currentXp;
  let hours = 0;
  let gpCost = 0;
  let covered = true;

  while (level < targetLevel) {
    const candidates = methods.filter(
      (m) => m.fromLevel <= level && m.toLevel > level
    );
    if (candidates.length === 0) {
      covered = false;
      break;
    }

    const best = candidates.reduce((a, b) =>
      b.xpPerHour > a.xpPerHour ? b : a
    );
    const nextLevel = Math.min(best.toLevel, targetLevel);
    const chunkXp = xpForLevel(nextLevel) - xp;
    const chunkHours = chunkXp / best.xpPerHour;

    hours += chunkHours;
    if (best.gpPerHour) gpCost += best.gpPerHour * chunkHours;
    segments.push({
      methodName: best.methodName,
      fromLevel: level,
      toLevel: nextLevel,
      hours: chunkHours,
    });

    xp = xpForLevel(nextLevel);
    level = nextLevel;
  }

  return {
    hours: covered ? Number(hours.toFixed(2)) : null,
    gpCost: Math.round(gpCost),
    segments,
    covered,
  };
}

/**
 * Build the unified plan for a set of goals.
 *
 * @param {object}   input
 * @param {object[]} input.playerSkills  [{ name, level, xp }]
 * @param {object[]} input.goals         [{ type:'skill', skill, target } | { type:'quest', slug }]
 * @param {Map}      input.questsBySlug   slug -> quest row
 * @param {Function} input.methodsForSkill (skill) => method rows
 */
export function buildPlan({ playerSkills, goals, questsBySlug, methodsForSkill }) {
  const skillByName = new Map(
    playerSkills.map((s) => [s.name.toLowerCase(), s])
  );

  const { required, questSlugs, missingQuests } = mergeRequiredLevels(
    goals,
    questsBySlug
  );

  const skillPlans = [];
  let totalXp = 0;
  let totalHours = 0;
  let anyUnknown = false;

  for (const [skill, targetLevel] of required) {
    const row = skillByName.get(skill);
    const currentXp = row?.xp ?? 0;
    const currentLevel = row?.level ?? levelForXp(currentXp);

    if (targetLevel <= currentLevel) continue; // already met

    const xpNeeded = xpForLevel(targetLevel) - currentXp;
    const estimate = estimateSkillTime(
      currentXp,
      targetLevel,
      methodsForSkill(skill)
    );

    totalXp += xpNeeded;
    if (estimate.hours == null) anyUnknown = true;
    else totalHours += estimate.hours;

    skillPlans.push({
      skill,
      currentLevel,
      targetLevel,
      xpNeeded,
      hours: estimate.hours,
      gpCost: estimate.gpCost,
      segments: estimate.segments,
    });
  }

  skillPlans.sort((a, b) => b.xpNeeded - a.xpNeeded);

  // Report each requested quest with the requirements still blocking it.
  const requestedQuestSlugs = goals
    .filter((g) => g.type === 'quest')
    .map((g) => g.slug);
  const { order: questOrder, cycles: questCycles } = orderQuestPath(
    requestedQuestSlugs,
    questsBySlug
  );

  const quests = requestedQuestSlugs.map((slug) => {
    const quest = questsBySlug.get(slug);
    if (!quest) return { slug, name: slug, found: false, blockingSkills: [] };

    const blockingSkills = Object.entries(quest.skillReqs || {})
      .map(([s, lvl]) => {
        const have = skillByName.get(s.toLowerCase());
        const currentLevel = have?.level ?? levelForXp(have?.xp ?? 0);
        return { skill: s.toLowerCase(), required: lvl, currentLevel };
      })
      .filter((r) => r.currentLevel < r.required);

    return {
      slug,
      name: quest.name,
      found: true,
      completableNow: blockingSkills.length === 0,
      blockingSkills,
    };
  });

  return {
    goals,
    skillPlans,
    quests,
    totalXp,
    totalHours: Number(totalHours.toFixed(2)),
    hasUnknownEstimate: anyUnknown,
    requiredQuests: [...questSlugs],
    questOrder: questOrder.map((quest) => ({
      slug: quest.slug,
      name: quest.name,
      difficulty: quest.difficulty,
      isRequested: requestedQuestSlugs.includes(quest.slug),
    })),
    questCycles,
    missingQuests: [...missingQuests],
  };
}
