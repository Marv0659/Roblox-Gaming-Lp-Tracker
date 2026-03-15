-- CreateTable
CREATE TABLE "RankEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trackedPlayerId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "queueType" TEXT NOT NULL,
    "tierBefore" TEXT,
    "rankBefore" TEXT,
    "leaguePointsBefore" INTEGER,
    "tierAfter" TEXT NOT NULL,
    "rankAfter" TEXT NOT NULL,
    "leaguePointsAfter" INTEGER NOT NULL,
    "rankSnapshotId" TEXT,

    CONSTRAINT "RankEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankEvent_trackedPlayerId_createdAt_idx" ON "RankEvent"("trackedPlayerId", "createdAt");

-- CreateIndex
CREATE INDEX "RankEvent_trackedPlayerId_queueType_createdAt_idx" ON "RankEvent"("trackedPlayerId", "queueType", "createdAt");

-- AddForeignKey
ALTER TABLE "RankEvent" ADD CONSTRAINT "RankEvent_trackedPlayerId_fkey" FOREIGN KEY ("trackedPlayerId") REFERENCES "TrackedPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
