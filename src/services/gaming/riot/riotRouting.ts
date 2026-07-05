export type RiotPlatformRegion =
  | "na1"
  | "br1"
  | "la1"
  | "la2"
  | "euw1"
  | "eun1"
  | "tr1"
  | "ru"
  | "kr"
  | "jp1"
  | "oc1"
  | "ph2"
  | "sg2"
  | "th2"
  | "tw2"
  | "vn2";

export type RiotRegionalRoute = "americas" | "europe" | "asia" | "sea";

const platformToRegionalRoute: Record<RiotPlatformRegion, RiotRegionalRoute> = {
  na1: "americas",
  br1: "americas",
  la1: "americas",
  la2: "americas",
  euw1: "europe",
  eun1: "europe",
  tr1: "europe",
  ru: "europe",
  kr: "asia",
  jp1: "asia",
  oc1: "sea",
  ph2: "sea",
  sg2: "sea",
  th2: "sea",
  tw2: "sea",
  vn2: "sea"
};

export const riotPlatformRegions = Object.keys(platformToRegionalRoute) as RiotPlatformRegion[];

export function normalizeRiotPlatformRegion(region: string): RiotPlatformRegion | null {
  const normalizedRegion = region.trim().toLowerCase();

  return riotPlatformRegions.includes(normalizedRegion as RiotPlatformRegion)
    ? normalizedRegion as RiotPlatformRegion
    : null;
}

export function getRegionalRouteForPlatform(region: RiotPlatformRegion): RiotRegionalRoute {
  return platformToRegionalRoute[region];
}

export function riotRegionalApiBaseUrl(route: RiotRegionalRoute): string {
  return `https://${route}.api.riotgames.com`;
}

export function riotPlatformApiBaseUrl(region: RiotPlatformRegion): string {
  return `https://${region}.api.riotgames.com`;
}
