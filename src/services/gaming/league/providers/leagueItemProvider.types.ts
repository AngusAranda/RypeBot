import { DataDragonItemDto } from "../leagueDataDragonService.js";
import { LeagueItem, LeagueItemSourceLink } from "../leagueTypes.js";

export type LeagueItemLookup = {
  query: string;
  normalizedQuery: string;
};

export type DataDragonItemResult = {
  item: LeagueItem;
  dataDragonItem: DataDragonItemDto;
};

export type LeagueItemEnrichmentContext = {
  item: LeagueItem;
  dataDragonItem?: DataDragonItemDto;
};

export type LeagueItemEnrichment = {
  links?: LeagueItemSourceLink[];
  rawData?: Record<string, unknown>;
};

export interface LeagueItemPrimaryProvider {
  findItem(lookup: LeagueItemLookup): Promise<DataDragonItemResult | null>;
}

export interface LeagueItemEnrichmentProvider {
  enrichItem(context: LeagueItemEnrichmentContext): Promise<LeagueItemEnrichment>;
}

export function normalizeLeagueItemQuery(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

export function wikiSafeItemName(value: string): string {
  return encodeURIComponent(value.trim().replaceAll(/\s+/g, "_"));
}
