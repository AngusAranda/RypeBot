import {
  LeagueItemEnrichment,
  LeagueItemEnrichmentContext,
  LeagueItemEnrichmentProvider,
  wikiSafeItemName
} from "./leagueItemProvider.types.js";

export class LeagueWikiItemProvider implements LeagueItemEnrichmentProvider {
  async enrichItem(context: LeagueItemEnrichmentContext): Promise<LeagueItemEnrichment> {
    return {
      links: [
        {
          label: "League Wiki",
          url: `https://wiki.leagueoflegends.com/en-us/${wikiSafeItemName(context.item.name)}`
        }
      ]
    };
  }
}
