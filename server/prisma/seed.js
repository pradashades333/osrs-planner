import { readFile } from 'node:fs/promises';
import { prisma } from '../db.js';

const quests = JSON.parse(
  await readFile(new URL('../data/quests.json', import.meta.url), 'utf8')
);

for (const quest of quests) {
  const data = {
    name: quest.name,
    difficulty: quest.difficulty,
    members: quest.members,
    questPoints: quest.questPoints,
    questPointsRequired: quest.questPointsRequired,
    skillReqs: quest.skillReqs,
    questReqs: quest.questReqs,
    xpRewards: quest.xpRewards
  };

  await prisma.quest.upsert({
    where: { slug: quest.slug },
    create: { slug: quest.slug, ...data },
    update: data
  });
}

// A quest listing a prerequisite that isn't seeded would silently block forever.
const slugs = new Set(quests.map((q) => q.slug));
for (const quest of quests) {
  for (const req of quest.questReqs) {
    if (!slugs.has(req)) {
      console.warn(`  warning: "${quest.slug}" requires unknown quest "${req}"`);
    }
  }
}

console.log(`Seeded ${quests.length} quests.`);
await prisma.$disconnect();
