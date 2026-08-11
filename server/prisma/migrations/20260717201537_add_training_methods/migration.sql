-- CreateTable
CREATE TABLE "TrainingMethod" (
    "id" SERIAL NOT NULL,
    "skill" TEXT NOT NULL,
    "methodName" TEXT NOT NULL,
    "fromLevel" INTEGER NOT NULL,
    "toLevel" INTEGER NOT NULL,
    "xpPerHour" INTEGER NOT NULL,
    "gpPerHour" INTEGER,
    "intensity" TEXT NOT NULL,
    "membersOnly" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "sourceUrl" TEXT,

    CONSTRAINT "TrainingMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingMethod_skill_idx" ON "TrainingMethod"("skill");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingMethod_skill_methodName_key" ON "TrainingMethod"("skill", "methodName");
