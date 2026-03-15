-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "TrackedPlayer" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "puuid" TEXT NOT NULL,
    "accountId" TEXT,
    "summonerId" TEXT,
    "gameName" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "routingRegion" TEXT NOT NULL,

    CONSTRAINT "TrackedPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankSnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trackedPlayerId" TEXT NOT NULL,
    "queueType" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "leaguePoints" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RankSnapshot_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "riotMatchId" TEXT NOT NULL,
    "gameStartAt" TIMESTAMP(3) NOT NULL,
    "queueId" INTEGER NOT NULL DEFAULT 0,
    "gameDuration" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchParticipant" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchId" TEXT NOT NULL,
    "trackedPlayerId" TEXT NOT NULL,
    "championId" INTEGER NOT NULL DEFAULT 0,
    "championName" TEXT,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "win" BOOLEAN NOT NULL DEFAULT false,
    "teamPosition" TEXT,
    "lane" TEXT,
    "cs" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "damageDealt" INTEGER NOT NULL DEFAULT 0,
    "visionScore" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedPlayer_puuid_key" ON "TrackedPlayer"("puuid");

-- CreateIndex
CREATE INDEX "TrackedPlayer_region_idx" ON "TrackedPlayer"("region");

-- CreateIndex
CREATE INDEX "TrackedPlayer_routingRegion_idx" ON "TrackedPlayer"("routingRegion");

-- CreateIndex
CREATE INDEX "TrackedPlayer_gameName_tagLine_region_idx" ON "TrackedPlayer"("gameName", "tagLine", "region");

-- CreateIndex
CREATE INDEX "RankSnapshot_trackedPlayerId_createdAt_idx" ON "RankSnapshot"("trackedPlayerId", "createdAt");

-- CreateIndex
CREATE INDEX "RankSnapshot_trackedPlayerId_queueType_createdAt_idx" ON "RankSnapshot"("trackedPlayerId", "queueType", "createdAt");

-- CreateIndex
CREATE INDEX "RankEvent_trackedPlayerId_createdAt_idx" ON "RankEvent"("trackedPlayerId", "createdAt");

-- CreateIndex
CREATE INDEX "RankEvent_trackedPlayerId_queueType_createdAt_idx" ON "RankEvent"("trackedPlayerId", "queueType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Match_riotMatchId_key" ON "Match"("riotMatchId");

-- CreateIndex
CREATE INDEX "Match_gameStartAt_idx" ON "Match"("gameStartAt");

-- CreateIndex
CREATE INDEX "Match_queueId_idx" ON "Match"("queueId");

-- CreateIndex
CREATE INDEX "MatchParticipant_trackedPlayerId_createdAt_idx" ON "MatchParticipant"("trackedPlayerId", "createdAt");

-- CreateIndex
CREATE INDEX "MatchParticipant_trackedPlayerId_win_idx" ON "MatchParticipant"("trackedPlayerId", "win");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_trackedPlayerId_key" ON "MatchParticipant"("matchId", "trackedPlayerId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankSnapshot" ADD CONSTRAINT "RankSnapshot_trackedPlayerId_fkey" FOREIGN KEY ("trackedPlayerId") REFERENCES "TrackedPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankEvent" ADD CONSTRAINT "RankEvent_trackedPlayerId_fkey" FOREIGN KEY ("trackedPlayerId") REFERENCES "TrackedPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_trackedPlayerId_fkey" FOREIGN KEY ("trackedPlayerId") REFERENCES "TrackedPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
