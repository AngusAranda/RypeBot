import "dotenv/config";
import { LeaguePlayerService, LeagueServiceError, parseRiotIdInput } from "../services/gaming/index.js";

const playerInput = process.argv[2];
const tagLineInput = process.argv[3]?.startsWith("--") ? undefined : process.argv[3];
const regionInput = process.argv.find((argument) => argument.startsWith("--region="))?.split("=")[1]
  ?? process.env.LOL_DEFAULT_REGION
  ?? "na1";

if (!playerInput) {
  console.error("Usage: npm run lol:player:debug -- \"GameName#TagLine\" --region=na1");
  console.error("   or: npm run lol:player:debug -- \"GameName\" \"TagLine\" --region=na1");
  process.exit(1);
}

const parsed = parseRiotIdInput(playerInput);
const tagLine = parsed.tagLine ?? tagLineInput ?? process.env.LOL_DEFAULT_TAGLINE;

if (!tagLine) {
  console.error("Missing Riot ID tagline. Provide GameName#TagLine or pass the tagline as the second argument.");
  process.exit(1);
}

try {
  const result = await new LeaguePlayerService().lookupPlayer(parsed.gameName, tagLine, regionInput);

  console.log(JSON.stringify({
    riotId: `${result.account.gameName}#${result.account.tagLine}`,
    region: result.platformRegion,
    level: result.summoner.summonerLevel,
    rankedQueues: result.rankedEntries.map((entry) => entry.queueType),
    recentMatches: result.recentMatches.length,
    scoutingSummary: result.scoutingSummary,
    links: result.links
  }, null, 2));
} catch (error) {
  if (error instanceof LeagueServiceError) {
    console.error(`${error.code}: ${error.message}`);
    process.exit(1);
  }

  throw error;
}
