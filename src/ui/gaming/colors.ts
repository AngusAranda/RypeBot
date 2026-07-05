import { LeagueItem } from "../../services/gaming/index.js";

export const gamingColors = {
  leagueBlue: 0x0a6cff,
  leagueGold: 0xc89b3c,
  bootsBlue: 0x3498db,
  starterGreen: 0x2ecc71,
  consumablePurple: 0x9b59b6,
  trinketGray: 0x95a5a6
} as const;

export function leagueItemColor(item: LeagueItem): number {
  const tags = item.tags.map((tag) => tag.toLowerCase());
  const name = item.name.toLowerCase();

  if (tags.includes("trinket") || tags.includes("vision") || name.includes("ward")) {
    return gamingColors.trinketGray;
  }

  if (tags.includes("consumable") || name.includes("potion") || name.includes("elixir")) {
    return gamingColors.consumablePurple;
  }

  if (tags.includes("boots") || name.includes("boots")) {
    return gamingColors.bootsBlue;
  }

  if (tags.includes("lane") || name.includes("starter") || item.gold.total <= 500) {
    return gamingColors.starterGreen;
  }

  if (item.gold.total >= 2000 || (item.into.length === 0 && item.from.length > 0)) {
    return gamingColors.leagueGold;
  }

  return gamingColors.leagueBlue;
}
