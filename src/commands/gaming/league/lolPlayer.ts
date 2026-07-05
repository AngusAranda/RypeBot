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
    case "account-not-found":
      return "I could not find that Riot ID. Check the game name and tag line, then try again.";
    case "rate-limited":
      return "Riot is rate limiting requests right now. Please try again shortly.";
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

export const lolPlayerCommand = {
  data: new SlashCommandBuilder()
    .setName("lol-player")
    .setDescription("Look up a League of Legends player by Riot ID.")
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("player")
        .setDescription("Full Riot ID, such as SomeName#NA1 or Some Name#1234.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("region")
        .setDescription("League platform region, such as na1, euw1, kr, or oc1.")
        .setRequired(true)
        .addChoices(...riotPlatformRegions.map((region) => ({ name: region, value: region })))
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const player = interaction.options.getString("player", true);
    const region = interaction.options.getString("region", true);
    const parsedPlayer = parseRiotIdInput(player);

    await interaction.deferReply();

    if (!parsedPlayer.isComplete || !parsedPlayer.tagLine) {
      await interaction.editReply({ embeds: [buildIncompleteRiotIdEmbed(player, region)] });
      return;
    }

    try {
      const profile = await leaguePlayerService.getPlayerProfile(parsedPlayer.gameName, parsedPlayer.tagLine, region);
      const embed = new EmbedBuilder()
        .setTitle(`${profile.account.gameName}#${profile.account.tagLine}`)
        .setDescription("League of Legends player profile")
        .setThumbnail(profile.profileIconUrl)
        .setColor(0xc89b3c)
        .addFields(
          { name: "Region", value: profile.platformRegion, inline: true },
          { name: "Account Route", value: profile.regionalRoute, inline: true },
          { name: "Summoner Level", value: `${profile.summoner.summonerLevel}`, inline: true },
          { name: "PUUID", value: `\`${profile.account.puuid}\`` }
        )
        .setFooter({ text: "Riot ID lookup via Account-V1, League profile via PUUID" });

      await interaction.editReply({ embeds: [embed] });
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
