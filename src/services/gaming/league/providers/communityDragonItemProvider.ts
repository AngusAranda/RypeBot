import {
  LeagueItemEnrichment,
  LeagueItemEnrichmentContext,
  LeagueItemEnrichmentProvider
} from "./leagueItemProvider.types.js";

export class CommunityDragonItemProvider implements LeagueItemEnrichmentProvider {
  private readonly baseUrl = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default";

  async enrichItem(context: LeagueItemEnrichmentContext): Promise<LeagueItemEnrichment> {
    const itemId = context.item.id;

    return {
      links: [
        {
          label: "Community Dragon raw item",
          url: `${this.baseUrl}/v1/items/${encodeURIComponent(itemId)}.json`
        },
        {
          label: "Community Dragon icon",
          url: `${this.baseUrl}/assets/items/icons2d/${encodeURIComponent(itemId)}.png`
        }
      ]
    };
  }
}
