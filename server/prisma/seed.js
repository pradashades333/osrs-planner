import { readFile } from 'node:fs/promises';
import { prisma } from '../db.js';

const quests = JSON.parse(
  await readFile(new URL('../data/quests.json', import.meta.url), 'utf8')
);

const methods = JSON.parse(
  await readFile(new URL('../data/methods.json', import.meta.url), 'utf8')
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

for (const method of methods) {
  const data = {
    fromLevel: method.fromLevel,
    toLevel: method.toLevel,
    xpPerHour: method.xpPerHour,
    gpPerHour: method.gpPerHour,
    intensity: method.intensity,
    membersOnly: method.membersOnly,
    notes: method.notes,
    sourceUrl: method.sourceUrl
  };

  await prisma.trainingMethod.upsert({
    where: { skill_methodName: { skill: method.skill, methodName: method.methodName } },
    create: { skill: method.skill, methodName: method.methodName, ...data },
    update: data
  });
}

console.log(`Seeded ${methods.length} training methods.`);
await prisma.$disconnect();
