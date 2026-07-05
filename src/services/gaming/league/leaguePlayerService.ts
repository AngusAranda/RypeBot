import { EmbedBuilder } from "discord.js";
import { RiotHttpClient, MissingRiotApiKeyError, RiotApiError } from "../riot/riotHttpClient.js";
import {
  getRegionalRouteForPlatform,
  normalizeRiotPlatformRegion,
  riotPlatformApiBaseUrl,
  riotRegionalApiBaseUrl,
  RiotPlatformRegion,
  RiotRegionalRoute
} from "../riot/riotRouting.js";
import { LeagueDataDragonService } from "./leagueDataDragonService.js";
import {
  ChampionMasterySummary,
  LeaguePlayerProfile,
  LeagueServiceError,
  LiveGameStatus,
  PlayerLookupResult,
  RankedEntry,
  RecentMatchSummary,
  RiotAccount,
  SummonerProfile
} from "./leagueTypes.js";

type RiotChampionMasteryDto = {
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
};

type RiotMatchDto = {
  metadata: { matchId: string };
  info: {
    queueId: number;
    gameCreation: number;
    gameDuration: number;
    participants: Array<{
      puuid: string;
      championName: string;
      kills: number;
      deaths: number;
      assists: number;
      win: boolean;
    }>;
  };
};

type RiotCurrentGameDto = {
  gameMode: string;
  gameType: string;
  gameQueueConfigId: number;
  gameLength: number;
  participants: Array<{
    puuid: string;
    championId: number;
  }>;
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
  1710: "Arena"
};

function formatRank(entry: RankedEntry): string {
  return `${entry.tier} ${entry.rank} - ${entry.leaguePoints} LP\n${entry.wins}W ${entry.losses}L (${winRate(entry.wins, entry.losses)}%)`;
}

function winRate(wins: number, losses: number): number {
  const total = wins + losses;
  return total ? Math.round((wins / total) * 100) : 0;
}

function kda(kills: number, deaths: number, assists: number): number {
  return deaths === 0 ? kills + assists : Number(((kills + assists) / deaths).toFixed(2));
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

export class LeaguePlayerService {
  constructor(
    private readonly riotClient = new RiotHttpClient(),
    private readonly dataDragon = new LeagueDataDragonService()
  ) {}

  async getPlayerProfile(gameName: string, tagLine: string, region: string): Promise<LeaguePlayerProfile> {
    const platformRegion = this.resolvePlatformRegion(region);
    const regionalRoute = getRegionalRouteForPlatform(platformRegion);
    const account = await this.resolveRiotAccount(gameName, tagLine, regionalRoute);
    const summoner = await this.getSummonerProfile(account.puuid, platformRegion);
    const version = await this.dataDragon.getLatestVersion();

    return {
      account,
      summoner,
      platformRegion,
      regionalRoute,
      profileIconUrl: this.dataDragon.profileIconUrl(version, summoner.profileIconId)
    };
  }

  async lookupPlayer(gameName: string, tagLine: string, region: string): Promise<PlayerLookupResult> {
    const platformRegion = this.resolvePlatformRegion(region);
    const regionalRoute = getRegionalRouteForPlatform(platformRegion);
    const account = await this.resolveRiotAccount(gameName, tagLine, regionalRoute);
    const [summoner, rankedEntries, topChampionMasteries, recentMatches, liveGameStatus, version] = await Promise.all([
      this.getSummonerProfile(account.puuid, platformRegion),
      this.getRankedEntries(account.puuid, platformRegion),
      this.getTopChampionMasteries(account.puuid, platformRegion),
      this.getRecentMatches(account.puuid, regionalRoute),
      this.getLiveGameStatus(account.puuid, platformRegion),
      this.dataDragon.getLatestVersion()
    ]);

    const links = this.buildExternalProfileLinks(account, platformRegion);

    return {
      account,
      summoner,
      rankedEntries,
      topChampionMasteries,
      recentMatches,
      liveGameStatus,
      links,
      scoutingSummary: this.buildScoutingSummary(recentMatches, topChampionMasteries, liveGameStatus),
      platformRegion,
      regionalRoute,
      profileIconUrl: this.dataDragon.profileIconUrl(version, summoner.profileIconId)
    };
  }

  async resolveRiotAccount(gameName: string, tagLine: string, regionalRoute: RiotRegionalRoute): Promise<RiotAccount> {
    if (!gameName.trim() || !tagLine.trim() || tagLine.includes("#")) {
      throw new LeagueServiceError("invalid-riot-id", "Riot ID must be formatted as GameName#TagLine.");
    }

    return await this.safeRiotRequest(
      () => this.riotClient.getJson<RiotAccount>(
        riotRegionalApiBaseUrl(regionalRoute),
        `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName.trim())}/${encodeURIComponent(tagLine.trim())}`
      ),
      "account-not-found"
    );
  }

  async getSummonerProfile(puuid: string, platformRegion: RiotPlatformRegion): Promise<SummonerProfile> {
    return await this.safeRiotRequest(
      () => this.riotClient.getJson<SummonerProfile>(
        riotPlatformApiBaseUrl(platformRegion),
        `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`
      ),
      "account-not-found"
    );
  }

  async getRankedEntries(puuid: string, platformRegion: RiotPlatformRegion): Promise<RankedEntry[]> {
    return await this.safeRiotRequest(
      () => this.riotClient.getJson<RankedEntry[]>(
        riotPlatformApiBaseUrl(platformRegion),
        `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`
      ),
      "riot-unavailable"
    );
  }

  async getTopChampionMasteries(puuid: string, platformRegion: RiotPlatformRegion, count = 5): Promise<ChampionMasterySummary[]> {
    const masteries = await this.safeRiotRequest(
      () => this.riotClient.getJson<RiotChampionMasteryDto[]>(
        riotPlatformApiBaseUrl(platformRegion),
        `/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}/top`,
        { query: { count } }
      ),
      "riot-unavailable"
    );

    return await Promise.all(masteries.map(async (mastery) => ({
      championId: mastery.championId,
      championName: await this.dataDragon.championNameByKey(mastery.championId),
      championLevel: mastery.championLevel,
      championPoints: mastery.championPoints,
      lastPlayTime: mastery.lastPlayTime
    })));
  }

  async getRecentMatches(puuid: string, regionalRoute: RiotRegionalRoute, count = 10): Promise<RecentMatchSummary[]> {
    const matchIds = await this.safeRiotRequest(
      () => this.riotClient.getJson<string[]>(
        riotRegionalApiBaseUrl(regionalRoute),
        `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids`,
        { query: { start: 0, count } }
      ),
      "match-data-unavailable"
    );

    const matches = await Promise.all(matchIds.map((matchId) =>
      this.safeRiotRequest(
        () => this.riotClient.getJson<RiotMatchDto>(
          riotRegionalApiBaseUrl(regionalRoute),
          `/lol/match/v5/matches/${encodeURIComponent(matchId)}`
        ),
        "match-data-unavailable"
      )
    ));

    return matches.flatMap((match) => {
      const participant = match.info.participants.find((candidate) => candidate.puuid === puuid);

      if (!participant) {
        return [];
      }

      return [{
        matchId: match.metadata.matchId,
        queueId: match.info.queueId,
        queueName: queueNames[match.info.queueId] ?? `Queue ${match.info.queueId}`,
        gameCreation: match.info.gameCreation,
        gameDurationSeconds: match.info.gameDuration,
        championName: participant.championName,
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
        win: participant.win,
        kda: kda(participant.kills, participant.deaths, participant.assists)
      }];
    });
  }

  async getLiveGameStatus(puuid: string, platformRegion: RiotPlatformRegion): Promise<LiveGameStatus> {
    try {
      const game = await this.riotClient.getJson<RiotCurrentGameDto>(
        riotPlatformApiBaseUrl(platformRegion),
        `/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`
      );
      const participant = game.participants.find((candidate) => candidate.puuid === puuid);

      return {
        inGame: true,
        gameMode: game.gameMode,
        gameType: game.gameType,
        queueId: game.gameQueueConfigId,
        queueName: queueNames[game.gameQueueConfigId] ?? `Queue ${game.gameQueueConfigId}`,
        championName: participant ? await this.dataDragon.championNameByKey(participant.championId) : undefined,
        gameLengthSeconds: game.gameLength
      };
    } catch (error) {
      if (error instanceof RiotApiError && error.status === 404) {
        return { inGame: false };
      }

      return await this.handleRiotError(error, "riot-unavailable");
    }
  }

  buildExternalProfileLinks(account: RiotAccount, platformRegion: RiotPlatformRegion) {
    const riotId = `${account.gameName}-${account.tagLine}`;
    const opggRegion = platformRegion === "eun1" ? "eune" : platformRegion.replace("1", "");
    const encodedGameName = encodeURIComponent(account.gameName);
    const encodedTag = encodeURIComponent(account.tagLine);

    return {
      opgg: `https://www.op.gg/summoners/${opggRegion}/${encodeURIComponent(riotId)}`,
      leagueOfGraphs: `https://www.leagueofgraphs.com/summoner/${opggRegion}/${encodeURIComponent(riotId)}`,
      mobalytics: `https://mobalytics.gg/lol/profile/${platformRegion}/${encodedGameName}-${encodedTag}/overview`,
      ugg: `https://u.gg/lol/profile/${platformRegion}/${encodedGameName}-${encodedTag}/overview`,
      riotAccount: `https://account.riotgames.com/riot-id`
    };
  }

  buildPlayerEmbedPages(result: PlayerLookupResult): EmbedBuilder[] {
    const solo = result.rankedEntries.find((entry) => entry.queueType === "RANKED_SOLO_5x5");
    const flex = result.rankedEntries.find((entry) => entry.queueType === "RANKED_FLEX_SR");
    const recentLines = result.recentMatches.slice(0, 5).map((match) =>
      `${match.win ? "W" : "L"} - **${match.championName}** ${match.kills}/${match.deaths}/${match.assists} (${match.kda} KDA) - ${match.queueName}`
    );
    const masteryLines = result.topChampionMasteries.slice(0, 5).map((mastery, index) =>
      `${index + 1}. **${mastery.championName}** - M${mastery.championLevel}, ${mastery.championPoints.toLocaleString()} pts`
    );
    const live = result.liveGameStatus.inGame
      ? `Live now: **${result.liveGameStatus.championName ?? "Unknown"}** in ${result.liveGameStatus.queueName ?? result.liveGameStatus.gameMode ?? "game"}`
      : "Not currently in a live game.";

    const overview = new EmbedBuilder()
      .setTitle(`${result.account.gameName}#${result.account.tagLine}`)
      .setDescription([
        "**League of Legends Player Lookup**",
        "",
        `Region: **${result.platformRegion.toUpperCase()}** | Routing: *${result.regionalRoute}*`,
        `Level: **${result.summoner.summonerLevel}**`,
        "",
        "**Scouting Summary**",
        `Recent WR: **${result.scoutingSummary.recentWinRate ?? "n/a"}${result.scoutingSummary.recentWinRate === undefined ? "" : "%"}**`,
        `Avg KDA: **${result.scoutingSummary.averageKda ?? "n/a"}**`,
        `Most played: **${result.scoutingSummary.mostPlayedChampion ?? "n/a"}**`,
        `Top mastery: **${result.scoutingSummary.topMasteryChampion ?? "n/a"}**`,
        live
      ].join("\n"))
      .setThumbnail(result.profileIconUrl)
      .setColor(0xc89b3c)
      .addFields(
        { name: "Ranked Solo/Duo", value: solo ? formatRank(solo) : "No ranked Solo/Duo data.", inline: true },
        { name: "Ranked Flex", value: flex ? formatRank(flex) : "No ranked Flex data.", inline: true }
      );

    const activity = new EmbedBuilder()
      .setTitle("Recent Activity & Mastery")
      .setColor(0x0ac8b9)
      .addFields(
        { name: "Recent Matches", value: recentLines.length ? truncate(recentLines.join("\n"), 1024) : "No recent matches available." },
        { name: "Top Champion Mastery", value: masteryLines.length ? truncate(masteryLines.join("\n"), 1024) : "No champion mastery data available." }
      );

    const links = new EmbedBuilder()
      .setTitle("Profile Links")
      .setColor(0x785a28)
      .setDescription([
        `[OP.GG](${result.links.opgg})`,
        `[League of Graphs](${result.links.leagueOfGraphs})`,
        `[Mobalytics](${result.links.mobalytics})`,
        `[U.GG](${result.links.ugg})`,
        `[Riot ID settings](${result.links.riotAccount})`
      ].join(" | "))
      .setFooter({ text: "Links are generated from Riot ID and region; no third-party pages are scraped." });

    return [overview, activity, links];
  }

  private buildScoutingSummary(
    recentMatches: RecentMatchSummary[],
    topChampionMasteries: ChampionMasterySummary[],
    liveGameStatus: LiveGameStatus
  ) {
    const wins = recentMatches.filter((match) => match.win).length;
    const championCounts = recentMatches.reduce<Record<string, number>>((counts, match) => {
      counts[match.championName] = (counts[match.championName] ?? 0) + 1;
      return counts;
    }, {});
    const mostPlayedChampion = Object.entries(championCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const averageKda = recentMatches.length
      ? Number((recentMatches.reduce((sum, match) => sum + match.kda, 0) / recentMatches.length).toFixed(2))
      : undefined;

    return {
      recentWinRate: recentMatches.length ? Math.round((wins / recentMatches.length) * 100) : undefined,
      averageKda,
      mostPlayedChampion,
      topMasteryChampion: topChampionMasteries[0]?.championName,
      liveGameStatus: liveGameStatus.inGame ? "In game" : "Not in game"
    };
  }

  private resolvePlatformRegion(region: string): RiotPlatformRegion {
    const platformRegion = normalizeRiotPlatformRegion(region);

    if (!platformRegion) {
      throw new LeagueServiceError("invalid-region", `Invalid League region "${region}".`);
    }

    return platformRegion;
  }

  private async safeRiotRequest<T>(
    request: () => Promise<T>,
    notFoundCode: "account-not-found" | "match-data-unavailable" | "riot-unavailable"
  ): Promise<T> {
    try {
      return await request();
    } catch (error) {
      return await this.handleRiotError(error, notFoundCode);
    }
  }

  private async handleRiotError<T>(
    error: unknown,
    notFoundCode: "account-not-found" | "match-data-unavailable" | "riot-unavailable"
  ): Promise<T> {
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
