import { LeagueDataDragonService } from "../leagueDataDragonService.js";
import { LeagueItem, LeagueItemBuildComponent } from "../leagueTypes.js";
import {
  DataDragonItemResult,
  LeagueItemLookup,
  LeagueItemPrimaryProvider,
  normalizeLeagueItemQuery
} from "./leagueItemProvider.types.js";

function stripHtml(value: string): string {
  return value
    .replaceAll(/<br\s*\/?>/gi, "\n")
    .replaceAll(/<\/(mainText|stats|attention|passive|active|rules|flavorText)>/gi, "\n")
    .replaceAll(/<(mainText|stats|attention|passive|active|rules|flavorText)[^>]*>/gi, "")
    .replaceAll(/<br\s*\/?>/gi, "\n")
    .replaceAll(/<[^>]*>/g, "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll(/&#x27;/gi, "'")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();
}

function resolveItemNames(itemIds: string[] | undefined, items: Record<string, { name: string }>): string[] {
  return (itemIds ?? []).map((itemId) => items[itemId]?.name ?? itemId);
}

function resolveBuildComponents(
  itemIds: string[] | undefined,
  items: Record<string, { name: string; gold?: { total: number } }>
): LeagueItemBuildComponent[] {
  return (itemIds ?? []).map((itemId) => ({
    id: itemId,
    name: items[itemId]?.name ?? itemId,
    totalGold: items[itemId]?.gold?.total
  }));
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
      fromNames: resolveItemNames(item.from, items.data),
      fromItems: resolveBuildComponents(item.from, items.data),
      into: item.into ?? [],
      intoNames: resolveItemNames(item.into, items.data),
      intoItems: resolveBuildComponents(item.into, items.data),
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
