import {
  ChatInputCommandInteraction,
  SlashCommandBuilder
} from "discord.js";
import { LeagueItemService, LeagueServiceError } from "../../../services/gaming/index.js";
import { buildLeagueItemEmbed } from "../../../ui/gaming/embeds/leagueItemEmbed.js";

const leagueItemService = new LeagueItemService();

export const lolItemCommand = {
  data: new SlashCommandBuilder()
    .setName("lol-item")
    .setDescription("Look up a League of Legends item.")
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("Item name or item ID.")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const itemQuery = interaction.options.getString("item", true);

    await interaction.deferReply();

    try {
      const item = await leagueItemService.findItem(itemQuery);

      await interaction.editReply({ embeds: [buildLeagueItemEmbed(item)] });
    } catch (error) {
      if (error instanceof LeagueServiceError && error.code === "item-not-found") {
        await interaction.editReply(`I could not find a League item matching "${itemQuery}".`);
        return;
      }

      console.error("Failed to look up League item:", error);
      await interaction.editReply("League item data is unavailable right now. Try again in a bit.");
    }
  }
};
