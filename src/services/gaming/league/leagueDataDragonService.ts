type DataDragonVersionsResponse = string[];

export type DataDragonItemDto = {
  name: string;
  plaintext?: string;
  description?: string;
  gold: {
    base: number;
    total: number;
    sell: number;
    purchasable: boolean;
  };
  stats?: Record<string, number>;
  from?: string[];
  into?: string[];
  maps?: Record<string, boolean>;
  depth?: number;
  consumed?: boolean;
  requiredChampion?: string;
  requiredAlly?: string;
  specialRecipe?: number;
  inStore?: boolean;
  hideFromAll?: boolean;
  tags?: string[];
  image: {
    full: string;
  };
};

export type DataDragonItemResponse = {
  data: Record<string, DataDragonItemDto>;
};

export class LeagueDataDragonService {
  private readonly baseUrl = "https://ddragon.leagueoflegends.com";
  private latestVersion?: string;
  private itemsByVersion = new Map<string, DataDragonItemResponse>();

  async getLatestVersion(): Promise<string> {
    if (this.latestVersion) {
      return this.latestVersion;
    }

    const response = await fetch(`${this.baseUrl}/api/versions.json`);

    if (!response.ok) {
      throw new Error(`Data Dragon version request failed with status ${response.status}.`);
    }

    const versions = await response.json() as DataDragonVersionsResponse;
    const latestVersion = versions[0];

    if (!latestVersion) {
      throw new Error("Data Dragon did not return any versions.");
    }

    this.latestVersion = latestVersion;
    return latestVersion;
  }

  async getItems(): Promise<DataDragonItemResponse> {
    const version = await this.getLatestVersion();

    return await this.getItemsByVersion(version);
  }

  async getItemsByVersion(version: string): Promise<DataDragonItemResponse> {
    const cachedItems = this.itemsByVersion.get(version);

    if (cachedItems) {
      return cachedItems;
    }

    const response = await fetch(`${this.baseUrl}/cdn/${version}/data/en_US/item.json`);

    if (!response.ok) {
      throw new Error(`Data Dragon item request failed with status ${response.status}.`);
    }

    const items = await response.json() as DataDragonItemResponse;
    this.itemsByVersion.set(version, items);
    return items;
  }

  itemDataUrl(version: string): string {
    return `${this.baseUrl}/cdn/${version}/data/en_US/item.json`;
  }

  itemImageUrl(version: string, imageName: string): string {
    return `${this.baseUrl}/cdn/${version}/img/item/${imageName}`;
  }

  profileIconUrl(version: string, profileIconId: number): string {
    return `${this.baseUrl}/cdn/${version}/img/profileicon/${profileIconId}.png`;
  }
}
