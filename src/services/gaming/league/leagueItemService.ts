import { LeagueItemAggregator } from "./leagueItemAggregator.js";
import { LeagueItem } from "./leagueTypes.js";

export class LeagueItemService {
  constructor(private readonly aggregator = new LeagueItemAggregator()) {}

  async findItem(query: string): Promise<LeagueItem> {
    return await this.aggregator.findItem(query);
  }
}
