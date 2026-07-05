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
  into: string[];
  maps: Record<string, boolean>;
  tags: string[];
  imageUrl: string;
  patchVersion: string;
  links: LeagueItemSourceLink[];
  rawData: Record<string, unknown>;
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

export type LeagueSummoner = {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
};

export type LeaguePlayerProfile = {
  account: RiotAccount;
  summoner: LeagueSummoner;
  platformRegion: RiotPlatformRegion;
  regionalRoute: RiotRegionalRoute;
  profileIconUrl: string;
};

export type LeagueServiceErrorCode =
  | "missing-api-key"
  | "invalid-region"
  | "item-not-found"
  | "account-not-found"
  | "rate-limited"
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
