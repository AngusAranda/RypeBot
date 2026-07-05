import { LeagueDataDragonService } from "../leagueDataDragonService.js";
import { LeagueItem } from "../leagueTypes.js";
import {
  DataDragonItemResult,
  LeagueItemLookup,
  LeagueItemPrimaryProvider,
  normalizeLeagueItemQuery
} from "./leagueItemProvider.types.js";

function stripHtml(value: string): string {
  return value
    .replaceAll(/<br\s*\/?>/gi, "\n")
    .replaceAll(/<[^>]*>/g, "")
    .replaceAll("&nbsp;", " ")
    .trim();
}

export class DataDragonItemProvider implements LeagueItemPrimaryProvider {
  constructor(private readonly dataDragon = new LeagueDataDragonService()) {}

  async findItem(lookup: LeagueItemLookup): Promise<DataDragonItemResult | null> {
    const version = await this.dataDragon.getLatestVersion();
    const items = await this.dataDragon.getItemsByVersion(version);
    const trimmedQuery = lookup.query.trim();
    const entry = Object.entries(items.data).find(([id, item]) =>
      id === trimmedQuery || normalizeLeagueItemQuery(item.name) === lookup.normalizedQuery
    ) ?? Object.entries(items.data).find(([, item]) =>
      normalizeLeagueItemQuery(item.name).includes(lookup.normalizedQuery)
    );

    if (!entry) {
      return null;
    }

    const [id, item] = entry;
    const leagueItem: LeagueItem = {
      id,
      name: item.name,
      plaintext: item.plaintext ?? "",
      description: stripHtml(item.description ?? ""),
      gold: item.gold,
      stats: item.stats ?? {},
      from: item.from ?? [],
      into: item.into ?? [],
      maps: item.maps ?? {},
      tags: item.tags ?? [],
      imageUrl: this.dataDragon.itemImageUrl(version, item.image.full),
      patchVersion: version,
      links: [
        { label: "Data Dragon icon", url: this.dataDragon.itemImageUrl(version, item.image.full) },
        { label: "Data Dragon item data", url: this.dataDragon.itemDataUrl(version) }
      ],
      rawData: {
        dataDragon: item
      }
    };

    return {
      item: leagueItem,
      dataDragonItem: item
    };
  }
}
