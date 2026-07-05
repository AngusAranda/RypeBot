import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder
} from "discord.js";
import { LeagueItem, LeagueItemService, LeagueServiceError } from "../../../services/gaming/index.js";

const leagueItemService = new LeagueItemService();
const embedFieldLimit = 1024;
const leagueBlue = 0x0a6cff;
const goldColor = 0xc89b3c;
const bootsBlue = 0x3498db;
const starterGreen = 0x2ecc71;
const consumablePurple = 0x9b59b6;
const trinketGray = 0x95a5a6;
const statNames: Record<string, string> = {
  FlatPhysicalDamageMod: "Attack Damage",
  PercentAttackSpeedMod: "Attack Speed",
  FlatHPPoolMod: "Health",
  FlatMagicDamageMod: "Ability Power",
  FlatMovementSpeedMod: "Move Speed",
  FlatArmorMod: "Armor",
  FlatSpellBlockMod: "Magic Resist",
  AbilityHasteMod: "Ability Haste",
  CritChanceMod: "Critical Strike Chance"
};
const mapNames: Record<string, string> = {
  "1": "Summoner's Rift",
  "8": "The Crystal Scar",
  "10": "Twisted Treeline",
  "11": "Summoner's Rift",
  "12": "Howling Abyss",
  "14": "Butcher's Bridge",
  "21": "Nexus Blitz",
  "22": "Teamfight Tactics",
  "30": "Arena",
  "33": "Swarm"
};

function truncateEmbedValue(value: string, maxLength = embedFieldLimit): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll(/&#x27;/gi, "'");
}

function cleanDescription(value: string): string {
  return truncateEmbedValue(
    decodeHtmlEntities(value)
      .replaceAll(/<br\s*\/?>/gi, "\n")
      .replaceAll(/<\/(mainText|stats|attention|passive|active|rules|flavorText)>/gi, "\n")
      .replaceAll(/<(mainText|stats|attention|passive|active|rules|flavorText)[^>]*>/gi, "")
      .replaceAll(/<[^>]*>/g, "")
      .replaceAll(/[ \t]+\n/g, "\n")
      .replaceAll(/\n{3,}/g, "\n\n")
      .trim(),
    2048
  );
}

function formatItemNames(names: string[]): string {
  return names.length > 0 ? names.join("\n") : "None";
}

function formatStatValue(key: string, value: number): string {
  if (key.startsWith("Percent") || key === "CritChanceMod") {
    return `${Math.round(value * 100)}%`;
  }

  return Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(2))}`;
}

function formatStats(stats: Record<string, number>): string {
  const entries = Object.entries(stats).filter(([, value]) => value !== 0);

  return entries.length > 0
    ? entries.map(([key, value]) => `${statNames[key] ?? key}: ${formatStatValue(key, value)}`).join("\n")
    : "None";
}

function formatMaps(maps: Record<string, boolean>): string {
  const entries = Object.entries(maps).filter(([, enabled]) => enabled);

  return entries.length > 0
    ? entries.map(([mapId]) => mapNames[mapId] ?? `Map ${mapId}`).join("\n")
    : "None";
}

function formatLinks(links: { label: string; url: string }[]): string {
  return links.length > 0
    ? links.map((link) => `[${link.label}](${link.url})`).join("\n")
    : "No source links available.";
}

function itemEmbedColor(item: LeagueItem): number {
  const tags = item.tags.map((tag) => tag.toLowerCase());
  const name = item.name.toLowerCase();

  if (tags.includes("trinket") || tags.includes("vision") || name.includes("ward")) {
    return trinketGray;
  }

  if (tags.includes("consumable") || name.includes("potion") || name.includes("elixir")) {
    return consumablePurple;
  }

  if (tags.includes("boots") || name.includes("boots")) {
    return bootsBlue;
  }

  if (tags.includes("lane") || name.includes("starter") || item.gold.total <= 500) {
    return starterGreen;
  }

  if (item.gold.total >= 2000 || item.into.length === 0 && item.from.length > 0) {
    return goldColor;
  }

  return leagueBlue;
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
        .setTitle(`${item.name} • ${item.gold.total}g`)
        .setDescription(cleanDescription(description || "No item description is available."))
        .setThumbnail(item.imageUrl)
        .setColor(itemEmbedColor(item))
        .addFields(
          { name: "Patch", value: item.patchVersion, inline: true },
          { name: "Item ID", value: item.id, inline: true },
          { name: "💰 Gold", value: `Total: ${item.gold.total}g\nBase: ${item.gold.base}g\nSell: ${item.gold.sell}g`, inline: true },
          { name: "📊 Stats", value: truncateEmbedValue(formatStats(item.stats)), inline: true },
          { name: "🧩 Builds From", value: truncateEmbedValue(formatItemNames(item.fromNames)), inline: true },
          { name: "🛠️ Builds Into", value: truncateEmbedValue(formatItemNames(item.intoNames)), inline: true },
          { name: "🗺️ Available Maps", value: truncateEmbedValue(formatMaps(item.maps)), inline: true },
          { name: "🏷️ Tags", value: truncateEmbedValue(item.tags.length > 0 ? item.tags.join(", ") : "None"), inline: true },
          { name: "🔗 Sources", value: truncateEmbedValue(formatLinks(item.links)) }
        )
        .setFooter({ text: "RypeBot Gaming • League of Legends • Data Dragon" })
        .setTimestamp();

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
