-- Add per-player lease table used to prevent overlapping sync jobs.
CREATE TABLE "PlayerSyncLease" (
  "playerId" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerSyncLease_pkey" PRIMARY KEY ("playerId")
);

ALTER TABLE "PlayerSyncLease"
ADD CONSTRAINT "PlayerSyncLease_playerId_fkey"
FOREIGN KEY ("playerId") REFERENCES "TrackedPlayer"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "PlayerSyncLease_expiresAt_idx" ON "PlayerSyncLease"("expiresAt");
