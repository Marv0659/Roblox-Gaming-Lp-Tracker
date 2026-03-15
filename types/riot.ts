/**
 * Riot API response types (subset we use).
 * Extend as needed for new endpoints.
 */

// account-v1: Get account by Riot ID
export interface RiotAccountDto {
  puuid: string;
  gameName: string;
  tagLine: string;
}

// summoner-v4: Get summoner by puuid
export interface SummonerDto {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

// league-v4: League entries (ranked)
export interface LeagueEntryDto {
  leagueId: string;
  summonerId: string;
  summonerName: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}

// match-v5: Match response
export interface MatchDto {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[]; // puuids
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp?: number;
    gameId: number;
    gameMode: string;
    gameName: string;
    gameStartTimestamp: number;
    gameType: string;
    gameVersion: string;
    mapId: number;
    participants: ParticipantDto[];
    platformId: string;
    queueId: number;
    teams?: TeamDto[];
  };
}

export interface ParticipantDto {
  puuid: string;
  summonerId?: string;
  championId: number;
  championName: string;
  teamId: number;
  teamPosition: string; // TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY
  individualPosition: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  totalMinionsKilled: number;
  neutralMinionsKilled?: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  visionScore: number;
}

export interface TeamDto {
  teamId: number;
  win: boolean;
}

// Input for adding a player (gameName, tagLine, region)
export interface AddPlayerInput {
  gameName: string;
  tagLine: string;
  region: string; // platform id: na1, euw1, etc.
}

// spectator-v5: Active game (current game) by summoner. 404 when not in game.
export interface ActiveGameParticipantDto {
  summonerId: string;
  championId: number;
  teamId: number;
  spell1Id?: number;
  spell2Id?: number;
}

export interface ActiveGameDto {
  gameId: number;
  gameStartTime: number; // Unix ms
  gameLength: number; // seconds (elapsed while in lobby/game)
  gameQueueConfigId: number; // 420 = Ranked Solo/Duo, 440 = Flex, 400 = Normal Draft, 450 = ARAM, etc.
  participants: ActiveGameParticipantDto[];
}
