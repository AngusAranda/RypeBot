import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder
} from "discord.js";
import {
  LeaguePlayerService,
  LeagueServiceError,
  normalizeRiotPlatformRegion,
  parseRiotIdInput,
  riotPlatformRegions
} from "../../../services/gaming/index.js";

const leaguePlayerService = new LeaguePlayerService();
const suggestedTaglines: Partial<Record<string, string>> = {
  na1: "NA1",
  euw1: "EUW",
  eun1: "EUNE",
  kr: "KR",
  jp1: "JP1"
};

function playerErrorMessage(error: LeagueServiceError): string {
  switch (error.code) {
    case "missing-api-key":
      return "RypeBot is missing RIOT_API_KEY, so League player lookup is not configured yet.";
    case "invalid-region":
      return `That is not a supported League region. Use one of: ${riotPlatformRegions.join(", ")}.`;
    case "invalid-riot-id":
      return "That Riot ID format does not look right. Use `GameName#TagLine`, or provide game name and tagline separately.";
    case "account-not-found":
      return "I could not find that Riot ID. Check the game name and tag line, then try again.";
    case "rate-limited":
      return "Riot is rate limiting requests right now. Please try again shortly.";
    case "match-data-unavailable":
      return "The player was found, but Riot match data is private or unavailable right now.";
    case "riot-unavailable":
      return "Riot API is unavailable or returned a failure right now. Please try again later.";
    case "item-not-found":
      return "That League item was not found.";
  }
}

function buildIncompleteRiotIdEmbed(player: string, region: string): EmbedBuilder {
  const normalizedRegion = normalizeRiotPlatformRegion(region);
  const suggestedTagline = normalizedRegion ? suggestedTaglines[normalizedRegion] : undefined;
  const fields = [
    {
      name: "Examples",
      value: [
        "/lol-player player: SomeName#NA1 region: na1",
        "/lol-player player: Some Name#1234 region: na1"
      ].join("\n")
    },
    {
      name: "Why",
      value: "Riot IDs require both game name and tagline because names are not globally unique."
    }
  ];

  if (suggestedTagline) {
    fields.push({
      name: "Possible tagline",
      value: `For ${region}, the platform-style tagline is often ${suggestedTagline}. This is only a suggestion, not a guaranteed lookup.`
    });
  }

  return new EmbedBuilder()
    .setTitle("I need the full Riot ID to find the exact player.")
    .setDescription(player ? `Received: ${player}` : "The player value was empty.")
    .setColor(0xc89b3c)
    .addFields(fields);
}

function configuredDefaultRegion(): string {
  return process.env.LOL_DEFAULT_REGION ?? "na1";
}

function configuredDefaultTagline(): string | undefined {
  return process.env.LOL_DEFAULT_TAGLINE;
}

export const lolPlayerCommand = {
  data: new SlashCommandBuilder()
    .setName("lol-player")
    .setDescription("Look up a League of Legends player by Riot ID.")
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("player")
        .setDescription("Full Riot ID, such as SomeName#NA1, or just the game name.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("tagline")
        .setDescription("Riot ID tagline, such as NA1, EUW, KR, or 1234.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("region")
        .setDescription("League platform region, such as na1, euw1, kr, or oc1.")
        .setRequired(false)
        .addChoices(...riotPlatformRegions.map((region) => ({ name: region, value: region })))
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const player = interaction.options.getString("player", true);
    const explicitTagline = interaction.options.getString("tagline");
    const region = interaction.options.getString("region") ?? configuredDefaultRegion();
    const parsedPlayer = parseRiotIdInput(player);
    const tagLine = parsedPlayer.tagLine ?? explicitTagline ?? configuredDefaultTagline();

    await interaction.deferReply();

    if (!tagLine) {
      await interaction.editReply({ embeds: [buildIncompleteRiotIdEmbed(player, region)] });
      return;
    }

    try {
      const profile = await leaguePlayerService.lookupPlayer(parsedPlayer.gameName, tagLine, region);
      await interaction.editReply({ embeds: leaguePlayerService.buildPlayerEmbedPages(profile) });
    } catch (error) {
      if (error instanceof LeagueServiceError) {
        await interaction.editReply(playerErrorMessage(error));
        return;
      }

      console.error("Failed to look up League player:", error);
      await interaction.editReply("League player lookup failed unexpectedly. Try again in a bit.");
    }
  }
};
