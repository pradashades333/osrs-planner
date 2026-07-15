// OSRS experience curve helpers.
// Level L requires floor( sum_{i=1}^{L-1} floor(i + 300 * 2^(i/7)) / 4 ) xp.

const MAX_LEVEL = 126; // 99 for regular skills, 126 is the virtual/combat ceiling

const XP_TABLE = (() => {
  const table = [0, 0]; // index 0 unused, level 1 = 0 xp
  let points = 0;
  for (let level = 1; level < MAX_LEVEL; level++) {
    points += Math.floor(level + 300 * Math.pow(2, level / 7));
    table[level + 1] = Math.floor(points / 4);
  }
  return table;
})();

export function levelToXp(level) {
  const clamped = Math.min(Math.max(Math.trunc(level), 1), MAX_LEVEL);
  return XP_TABLE[clamped];
}

export function xpToLevel(xp) {
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  let level = 1;
  while (level < MAX_LEVEL && XP_TABLE[level + 1] <= xp) level++;
  return level;
}

/** XP still needed to go from current xp to `targetLevel`. Never negative. */
export function xpToLevelFrom(currentXp, targetLevel) {
  return Math.max(0, levelToXp(targetLevel) - Math.max(0, currentXp));
}

/** XP remaining until the next level up. Returns 0 once maxed. */
export function xpToNextLevel(currentXp) {
  const level = xpToLevel(currentXp);
  if (level >= MAX_LEVEL) return 0;
  return levelToXp(level + 1) - currentXp;
}

/** Progress through the current level, 0..1. */
export function levelProgress(currentXp) {
  const level = xpToLevel(currentXp);
  if (level >= MAX_LEVEL) return 1;
  const start = levelToXp(level);
  const end = levelToXp(level + 1);
  return (currentXp - start) / (end - start);
}

export { MAX_LEVEL, XP_TABLE };
