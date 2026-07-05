import { RiotHttpClient, MissingRiotApiKeyError, RiotApiError } from "../riot/riotHttpClient.js";
import {
  getRegionalRouteForPlatform,
  normalizeRiotPlatformRegion,
  riotPlatformApiBaseUrl,
  riotRegionalApiBaseUrl
} from "../riot/riotRouting.js";
import { LeagueDataDragonService } from "./leagueDataDragonService.js";
import { LeaguePlayerProfile, LeagueServiceError, LeagueSummoner, RiotAccount } from "./leagueTypes.js";

export class LeaguePlayerService {
  constructor(
    private readonly riotClient = new RiotHttpClient(),
    private readonly dataDragon = new LeagueDataDragonService()
  ) {}

  async getPlayerProfile(gameName: string, tagLine: string, region: string): Promise<LeaguePlayerProfile> {
    const platformRegion = normalizeRiotPlatformRegion(region);

    if (!platformRegion) {
      throw new LeagueServiceError("invalid-region", `Invalid League region "${region}".`);
    }

    const regionalRoute = getRegionalRouteForPlatform(platformRegion);

    try {
      const account = await this.riotClient.getJson<RiotAccount>(
        riotRegionalApiBaseUrl(regionalRoute),
        `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
      );
      const summoner = await this.riotClient.getJson<LeagueSummoner>(
        riotPlatformApiBaseUrl(platformRegion),
        `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(account.puuid)}`
      );
      const version = await this.dataDragon.getLatestVersion();

      return {
        account,
        summoner,
        platformRegion,
        regionalRoute,
        profileIconUrl: this.dataDragon.profileIconUrl(version, summoner.profileIconId)
      };
    } catch (error) {
      if (error instanceof MissingRiotApiKeyError) {
        throw new LeagueServiceError("missing-api-key", "RIOT_API_KEY is not configured.");
      }

      if (error instanceof RiotApiError) {
        if (error.status === 404) {
          throw new LeagueServiceError("account-not-found", `Could not find Riot ID ${gameName}#${tagLine}.`);
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
