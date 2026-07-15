-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "rsn" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'main',
    "totalLevel" INTEGER NOT NULL DEFAULT 32,
    "totalXp" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" SERIAL NOT NULL,
    "playerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT -1,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "members" BOOLEAN NOT NULL DEFAULT false,
    "questPoints" INTEGER NOT NULL DEFAULT 0,
    "questPointsRequired" INTEGER NOT NULL DEFAULT 0,
    "skillReqs" JSONB NOT NULL,
    "questReqs" TEXT[],
    "xpRewards" JSONB NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestCompletion" (
    "id" SERIAL NOT NULL,
    "playerId" TEXT NOT NULL,
    "questId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_rsn_key" ON "Player"("rsn");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_playerId_name_key" ON "Skill"("playerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Quest_slug_key" ON "Quest"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "QuestCompletion_playerId_questId_key" ON "QuestCompletion"("playerId", "questId");

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestCompletion" ADD CONSTRAINT "QuestCompletion_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestCompletion" ADD CONSTRAINT "QuestCompletion_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
