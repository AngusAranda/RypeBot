import { MissingRiotApiKeyError, RiotApiError, RiotHttpClient } from "../riot/riotHttpClient.js";
import {
  normalizeRiotPlatformRegion,
  normalizeRiotRegionalRoute,
  riotRegionalApiBaseUrl,
  RiotPlatformRegion,
  RiotRegionalRoute
} from "../riot/riotRouting.js";
import { LeagueServiceError, RiotAccount } from "./leagueTypes.js";

type RiotMatchDto = {
  metadata: { matchId: string };
  info: {
    gameCreation: number;
    gameStartTimestamp?: number;
    gameDuration: number;
    gameEndTimestamp?: number;
    gameVersion?: string;
    queueId: number;
    participants: Array<{
      puuid: string;
      riotIdGameName?: string;
      riotIdTagline?: string;
      summonerName?: string;
      championName: string;
      kills: number;
      deaths: number;
      assists: number;
      totalMinionsKilled: number;
      neutralMinionsKilled: number;
      goldEarned: number;
      totalDamageDealtToChampions: number;
      win: boolean;
    }>;
  };
};

export type LeagueReplayConfig = {
  gameName: string;
  tagLine: string;
  regionalRoute: RiotRegionalRoute;
  platformRegion: RiotPlatformRegion;
};

export type LeagueReplayMatchSummary = {
  account: RiotAccount;
  matchId: string;
  championName: string;
  queueName: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damageDealtToChampions: number;
  durationSeconds: number;
  startTime: Date;
  gameVersion?: string;
};

const queueNames: Record<number, string> = {
  400: "Normal Draft",
  420: "Ranked Solo/Duo",
  430: "Normal Blind",
  440: "Ranked Flex",
  450: "ARAM",
  700: "Clash",
  900: "URF",
  1020: "One for All",
  1700: "Arena",
  1710: "Arena",
  1900: "URF"
};

export class LeagueReplayService {
  constructor(private readonly riotClient = new RiotHttpClient()) {}

  getConfiguredAccount(): LeagueReplayConfig {
    const regionalRoute = normalizeRiotRegionalRoute(process.env.RIOT_REGION ?? "americas");
    const platformRegion = normalizeRiotPlatformRegion(process.env.RIOT_PLATFORM ?? "na1");

    if (!regionalRoute) {
      throw new LeagueServiceError("invalid-region", "RIOT_REGION must be one of americas, europe, asia, or sea.");
    }

    if (!platformRegion) {
      throw new LeagueServiceError("invalid-region", "RIOT_PLATFORM must be a valid League platform, such as na1.");
    }

    return {
      gameName: process.env.RIOT_GAME_NAME ?? "AngusAranda",
      tagLine: process.env.RIOT_TAG_LINE ?? "9787",
      regionalRoute,
      platformRegion
    };
  }

  async getLatestCompletedMatch(): Promise<LeagueReplayMatchSummary> {
    const config = this.getConfiguredAccount();
    const account = await this.resolveAccount(config);
    const matchIds = await this.safeRiotRequest(
      () => this.riotClient.getJson<string[]>(
        riotRegionalApiBaseUrl(config.regionalRoute),
        `/lol/match/v5/matches/by-puuid/${encodeURIComponent(account.puuid)}/ids`,
        { query: { start: 0, count: 5 } }
      ),
      "match-data-unavailable"
    );

    if (!matchIds.length) {
      throw new LeagueServiceError("match-data-unavailable", "No completed matches were returned by Riot.");
    }

    for (const matchId of matchIds) {
      const summary = await this.getMatchSummary(matchId, account);

      if (summary) {
        return summary;
      }
    }

    throw new LeagueServiceError("match-data-unavailable", "No completed match details were available.");
  }

  async getMatchSummaryById(matchId: string): Promise<LeagueReplayMatchSummary> {
    const config = this.getConfiguredAccount();
    const account = await this.resolveAccount(config);
    const summary = await this.getMatchSummary(matchId, account);

    if (!summary) {
      throw new LeagueServiceError("match-data-unavailable", "Match details were not available.");
    }

    return summary;
  }

  private async resolveAccount(config: LeagueReplayConfig): Promise<RiotAccount> {
    return await this.safeRiotRequest(
      () => this.riotClient.getJson<RiotAccount>(
        riotRegionalApiBaseUrl(config.regionalRoute),
        `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(config.gameName)}/${encodeURIComponent(config.tagLine)}`
      ),
      "account-not-found"
    );
  }

  private async getMatchSummary(matchId: string, account: RiotAccount): Promise<LeagueReplayMatchSummary | undefined> {
    const config = this.getConfiguredAccount();
    const match = await this.safeRiotRequest(
      () => this.riotClient.getJson<RiotMatchDto>(
        riotRegionalApiBaseUrl(config.regionalRoute),
        `/lol/match/v5/matches/${encodeURIComponent(matchId)}`
      ),
      "match-data-unavailable"
    );
    const participant = match.info.participants.find((candidate) => candidate.puuid === account.puuid);

    if (!participant) {
      return undefined;
    }

    return {
      account,
      matchId: match.metadata.matchId,
      championName: participant.championName,
      queueName: queueNames[match.info.queueId] ?? `Queue ${match.info.queueId}`,
      win: participant.win,
      kills: participant.kills,
      deaths: participant.deaths,
      assists: participant.assists,
      cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
      gold: participant.goldEarned,
      damageDealtToChampions: participant.totalDamageDealtToChampions,
      durationSeconds: match.info.gameDuration,
      startTime: new Date(match.info.gameStartTimestamp ?? match.info.gameCreation),
      gameVersion: match.info.gameVersion
    };
  }

  private async safeRiotRequest<T>(
    request: () => Promise<T>,
    notFoundCode: "account-not-found" | "match-data-unavailable"
  ): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (error instanceof MissingRiotApiKeyError) {
        throw new LeagueServiceError("missing-api-key", "RIOT_API_KEY is not configured.");
      }

      if (error instanceof RiotApiError) {
        if (error.status === 404) {
          throw new LeagueServiceError(notFoundCode, "Riot API returned 404.");
        }

        if (error.status === 429) {
          throw new LeagueServiceError("rate-limited", "Riot API rate limit reached.");
        }

        throw new LeagueServiceError("riot-unavailable", `Riot API request failed with status ${error.status}.`);
      }

      throw new LeagueServiceError("riot-unavailable", "Riot API is unavailable or returned an unexpected response.");
    }
  }
}
