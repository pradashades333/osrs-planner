import { getStatsByGamemode } from 'osrs-json-hiscores';

/**
 * Skills we care about, in the order the game lists them.
 * `overall` is handled separately since its xp can exceed a 32-bit int.
 */
export const SKILL_NAMES = [
  'attack',
  'hitpoints',
  'mining',
  'strength',
  'agility',
  'smithing',
  'defence',
  'herblore',
  'fishing',
  'ranged',
  'thieving',
  'cooking',
  'prayer',
  'crafting',
  'firemaking',
  'magic',
  'fletching',
  'woodcutting',
  'runecraft',
  'slayer',
  'farming',
  'construction',
  'hunter'
];

export class HiscoresError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HiscoresError';
    this.status = status;
  }
}

export const GAMEMODES = ['main', 'ironman', 'hardcore', 'ultimate'];

/**
 * Trims and validates a username. Call this before touching the database so a
 * junk name is rejected with a 400 rather than costing a query.
 *
 * @returns {string} The trimmed username.
 */
export function normaliseRsn(rsn) {
  const name = String(rsn ?? '').trim();

  if (!name) {
    throw new HiscoresError('A username is required.', 400);
  }
  // The hiscores only accept 1-12 chars of letters, numbers, spaces and underscores.
  if (!/^[a-zA-Z0-9 _-]{1,12}$/.test(name)) {
    throw new HiscoresError(`"${name}" is not a valid OSRS username.`, 400);
  }
  return name;
}

/** Validates a gamemode, defaulting to `main`. */
export function normaliseMode(mode) {
  if (mode === undefined || mode === null || mode === '') return 'main';
  if (!GAMEMODES.includes(mode)) {
    throw new HiscoresError(`"${mode}" is not a valid gamemode.`, 400);
  }
  return mode;
}

/**
 * Fetches a player's stats from the official hiscores and normalises them.
 *
 * @param {string} rsn Username to look up.
 * @param {'main'|'ironman'|'hardcore'|'ultimate'} mode Gamemode hiscores table.
 * @returns {Promise<{rsn: string, mode: string, totalLevel: number, totalXp: number, skills: Array<{name: string, level: number, xp: number, rank: number}>}>}
 */
export async function fetchPlayerStats(rsn, mode = 'main') {
  const name = normaliseRsn(rsn);

  let stats;
  try {
    stats = await getStatsByGamemode(name, mode);
  } catch (err) {
    const message = String(err?.message ?? err);
    if (/not found|does not exist/i.test(message)) {
      throw new HiscoresError(`Player "${name}" was not found on the ${mode} hiscores.`, 404);
    }
    throw new HiscoresError(`The OSRS hiscores are unreachable right now (${message}).`, 502);
  }

  const skills = SKILL_NAMES.map((skillName) => {
    const skill = stats.skills?.[skillName] ?? {};
    return {
      name: skillName,
      // Unranked skills come back as -1; treat those as a fresh account.
      level: Math.max(1, skill.level ?? 1),
      xp: Math.max(0, skill.xp ?? 0),
      rank: skill.rank ?? -1
    };
  });

  const overall = stats.skills?.overall ?? {};

  return {
    rsn: name,
    mode,
    totalLevel: Math.max(32, overall.level ?? 32),
    totalXp: Math.max(0, overall.xp ?? 0),
    skills
  };
}
