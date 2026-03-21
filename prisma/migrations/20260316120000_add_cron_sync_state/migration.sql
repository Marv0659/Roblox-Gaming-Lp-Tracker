-- Single-row cursor for stepped cron sync (one player per HTTP request).
CREATE TABLE "CronSyncState" (
    "id" TEXT NOT NULL,
    "lastPlayerId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CronSyncState_pkey" PRIMARY KEY ("id")
);
