import { LeagueItem, LeagueServiceError } from "./leagueTypes.js";
import { CommunityDragonItemProvider } from "./providers/communityDragonItemProvider.js";
import { DataDragonItemProvider } from "./providers/dataDragonItemProvider.js";
import { FandomItemProvider } from "./providers/fandomItemProvider.js";
import { LeagueWikiItemProvider } from "./providers/leagueWikiItemProvider.js";
import {
  LeagueItemEnrichmentProvider,
  LeagueItemPrimaryProvider,
  normalizeLeagueItemQuery
} from "./providers/leagueItemProvider.types.js";

export class LeagueItemAggregator {
  constructor(
    private readonly primaryProvider: LeagueItemPrimaryProvider = new DataDragonItemProvider(),
    private readonly enrichmentProviders: LeagueItemEnrichmentProvider[] = [
      new CommunityDragonItemProvider(),
      new LeagueWikiItemProvider(),
      new FandomItemProvider()
    ]
  ) {}

  async findItem(query: string): Promise<LeagueItem> {
    const primaryResult = await this.primaryProvider.findItem({
      query,
      normalizedQuery: normalizeLeagueItemQuery(query)
    });

    if (!primaryResult) {
      throw new LeagueServiceError("item-not-found", `Could not find a League item matching "${query}".`);
    }

    const item = primaryResult.item;

    for (const provider of this.enrichmentProviders) {
      try {
        const enrichment = await provider.enrichItem({
          item,
          dataDragonItem: primaryResult.dataDragonItem
        });

        if (enrichment.links) {
          item.links.push(...enrichment.links);
        }

        if (enrichment.rawData) {
          item.rawData = {
            ...item.rawData,
            ...enrichment.rawData
          };
        }
      } catch (error) {
        console.warn("League item enrichment provider failed:", error);
      }
    }

    return item;
  }
}
