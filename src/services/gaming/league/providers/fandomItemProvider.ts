import {
  LeagueItemEnrichment,
  LeagueItemEnrichmentContext,
  LeagueItemEnrichmentProvider,
  wikiSafeItemName
} from "./leagueItemProvider.types.js";

export class FandomItemProvider implements LeagueItemEnrichmentProvider {
  async enrichItem(context: LeagueItemEnrichmentContext): Promise<LeagueItemEnrichment> {
    return {
      links: [
        {
          label: "Fandom legacy wiki",
          url: `https://leagueoflegends.fandom.com/wiki/${wikiSafeItemName(context.item.name)}`
        }
      ]
    };
  }
}
