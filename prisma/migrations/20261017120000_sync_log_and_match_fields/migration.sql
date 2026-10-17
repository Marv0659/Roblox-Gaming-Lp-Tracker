-- Manual sync throttling
ALTER TABLE "TrackedPlayer" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Extra match data
ALTER TABLE "Match" ADD COLUMN "gameVersion" TEXT;
ALTER TABLE "Match" ADD COLUMN "participantPuuids" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MatchParticipant" ADD COLUMN "teamId" INTEGER;
ALTER TABLE "MatchParticipant" ADD COLUMN "earlySurrender" BOOLEAN NOT NULL DEFAULT false;

-- Sync run log
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "trigger" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "playersSynced" INTEGER NOT NULL DEFAULT 0,
    "matchesAdded" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SyncLog_startedAt_idx" ON "SyncLog"("startedAt");
