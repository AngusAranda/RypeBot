import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder
} from "discord.js";
import { LeagueItemService, LeagueServiceError } from "../../../services/gaming/index.js";

const leagueItemService = new LeagueItemService();

function truncateEmbedValue(value: string, maxLength = 1024): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function formatItemIds(ids: string[]): string {
  return ids.length > 0 ? ids.join(", ") : "None";
}

function formatStats(stats: Record<string, number>): string {
  const entries = Object.entries(stats).filter(([, value]) => value !== 0);

  return entries.length > 0
    ? entries.map(([key, value]) => `${key}: ${value}`).join("\n")
    : "None";
}

function formatMaps(maps: Record<string, boolean>): string {
  const entries = Object.entries(maps);

  return entries.length > 0
    ? entries.map(([mapId, enabled]) => `${mapId}: ${enabled ? "yes" : "no"}`).join(", ")
    : "None";
}

function formatLinks(links: { label: string; url: string }[]): string {
  return links.length > 0
    ? links.map((link) => `[${link.label}](${link.url})`).join("\n")
    : "No source links available.";
}

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
      const description = [
        item.plaintext,
        item.description
      ].filter(Boolean).join("\n\n");
      const embed = new EmbedBuilder()
        .setTitle(item.name)
        .setDescription(description || "No item description is available.")
        .setThumbnail(item.imageUrl)
        .setColor(0x0a6cff)
        .addFields(
          { name: "Item ID", value: item.id, inline: true },
          { name: "Total Gold", value: `${item.gold.total}`, inline: true },
          { name: "Sell Value", value: `${item.gold.sell}`, inline: true },
          { name: "Base Gold", value: `${item.gold.base}`, inline: true },
          { name: "Purchasable", value: item.gold.purchasable ? "Yes" : "No", inline: true },
          { name: "Patch", value: item.patchVersion, inline: true },
          { name: "Tags", value: item.tags.length > 0 ? item.tags.join(", ") : "None" },
          { name: "Stats", value: truncateEmbedValue(formatStats(item.stats)), inline: true },
          { name: "Maps", value: truncateEmbedValue(formatMaps(item.maps)), inline: true },
          { name: "Builds From", value: truncateEmbedValue(formatItemIds(item.from)), inline: true },
          { name: "Builds Into", value: truncateEmbedValue(formatItemIds(item.into)) },
          { name: "Sources", value: truncateEmbedValue(formatLinks(item.links)) }
        )
        .setFooter({ text: "Data Dragon is the source of truth. Other links are enrichment." });

      await interaction.editReply({ embeds: [embed] });
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
