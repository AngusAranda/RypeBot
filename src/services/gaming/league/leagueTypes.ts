import { RiotPlatformRegion, RiotRegionalRoute } from "../riot/riotRouting.js";

export type LeagueItem = {
  id: string;
  name: string;
  plaintext: string;
  description: string;
  gold: {
    base: number;
    total: number;
    sell: number;
    purchasable: boolean;
  };
  stats: Record<string, number>;
  from: string[];
  fromNames: string[];
  fromItems: LeagueItemBuildComponent[];
  into: string[];
  intoNames: string[];
  intoItems: LeagueItemBuildComponent[];
  maps: Record<string, boolean>;
  tags: string[];
  imageUrl: string;
  patchVersion: string;
  links: LeagueItemSourceLink[];
  rawData: Record<string, unknown>;
};

export type LeagueItemBuildComponent = {
  id: string;
  name: string;
  totalGold?: number;
};

export type LeagueItemSourceLink = {
  label: string;
  url: string;
};

export type RiotAccount = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

export type SummonerProfile = {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
};

export type LeagueSummoner = SummonerProfile;

export type RankedEntry = {
  queueType: "RANKED_SOLO_5x5" | "RANKED_FLEX_SR" | string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
};

export type ChampionMasterySummary = {
  championId: number;
  championName: string;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
};

export type RecentMatchSummary = {
  matchId: string;
  queueId: number;
  queueName: string;
  gameCreation: number;
  gameDurationSeconds: number;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  kda: number;
};

export type LiveGameStatus = {
  inGame: boolean;
  gameMode?: string;
  gameType?: string;
  queueId?: number;
  queueName?: string;
  championName?: string;
  gameLengthSeconds?: number;
};

export type LeagueExternalProfileLinks = {
  opgg: string;
  leagueOfGraphs: string;
  mobalytics: string;
  ugg: string;
  riotAccount: string;
};

export type PlayerScoutingSummary = {
  recentWinRate?: number;
  averageKda?: number;
  mostPlayedChampion?: string;
  topMasteryChampion?: string;
  liveGameStatus: string;
};

export type PlayerLookupResult = {
  account: RiotAccount;
  summoner: SummonerProfile;
  rankedEntries: RankedEntry[];
  topChampionMasteries: ChampionMasterySummary[];
  recentMatches: RecentMatchSummary[];
  liveGameStatus: LiveGameStatus;
  links: LeagueExternalProfileLinks;
  scoutingSummary: PlayerScoutingSummary;
  platformRegion: RiotPlatformRegion;
  regionalRoute: RiotRegionalRoute;
  profileIconUrl: string;
};

export type LeaguePlayerProfile = {
  account: RiotAccount;
  summoner: SummonerProfile;
  platformRegion: RiotPlatformRegion;
  regionalRoute: RiotRegionalRoute;
  profileIconUrl: string;
};

export type LeagueServiceErrorCode =
  | "missing-api-key"
  | "invalid-region"
  | "invalid-riot-id"
  | "item-not-found"
  | "account-not-found"
  | "rate-limited"
  | "match-data-unavailable"
  | "riot-unavailable";

export class LeagueServiceError extends Error {
  constructor(
    readonly code: LeagueServiceErrorCode,
    message: string
  ) {
    super(message);
    this.name = "LeagueServiceError";
  }
}
