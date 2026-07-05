import { EmbedBuilder } from "discord.js";
import { LeagueItem, LeagueItemBuildComponent, LeagueItemSourceLink } from "../../../services/gaming/index.js";
import { leagueItemColor } from "../colors.js";
import { gamingEmojis } from "../emojis.js";
import {
  bold,
  bulletList,
  cleanDataDragonText,
  discordLimits,
  italic,
  spacedLines,
  truncateDiscord
} from "../markdown.js";

type DataDragonRawItem = {
  description?: string;
};

type PassiveSection = {
  name: string;
  text: string;
};

const statLabels: Record<string, string> = {
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

const categoryLabels: Record<string, string> = {
  AbilityHaste: "Ability Haste",
  CooldownReduction: "Ability Haste",
  NonbootsMovement: "Movement Speed",
  AttackSpeed: "Attack Speed",
  OnHit: "On-Hit",
  SpellDamage: "Ability Power",
  Health: "Health",
  Damage: "Attack Damage",
  CriticalStrike: "Critical Strike",
  Armor: "Armor",
  SpellBlock: "Magic Resist",
  Boots: "Boots",
  Consumable: "Consumable",
  Trinket: "Trinket",
  Vision: "Vision",
  Mana: "Mana",
  ManaRegen: "Mana Regen",
  HealthRegen: "Health Regen",
  LifeSteal: "Life Steal",
  SpellVamp: "Omnivamp",
  MagicPenetration: "Magic Penetration",
  ArmorPenetration: "Armor Penetration",
  Slow: "Slow",
  Aura: "Aura",
  Active: "Active"
};

const knownMapLabels: Record<string, string> = {
  "11": "Summoner's Rift",
  "12": "ARAM",
  "21": "Nexus Blitz"
};

function rawDataDragonItem(item: LeagueItem): DataDragonRawItem | null {
  const rawItem = item.rawData.dataDragon;

  return rawItem && typeof rawItem === "object" ? rawItem as DataDragonRawItem : null;
}

function formatStatValue(key: string, value: number): string {
  if (key.startsWith("Percent") || key === "CritChanceMod") {
    return `+${Math.round(value * 100)}%`;
  }

  const roundedValue = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return `+${roundedValue}`;
}

function formatStats(item: LeagueItem): string {
  const stats = Object.entries(item.stats).filter(([, value]) => value !== 0);

  return truncateDiscord(
    stats.length > 0
      ? stats.map(([key, value]) => `• ${bold(formatStatValue(key, value))} ${statLabels[key] ?? key}`).join("\n")
      : "*None*"
  );
}

function componentTotalGold(components: LeagueItemBuildComponent[]): number {
  return components.reduce((total, component) => total + (component.totalGold ?? 0), 0);
}

function formatGold(item: LeagueItem): string {
  const components = componentTotalGold(item.fromItems);
  const recipeCost = item.fromItems.length > 0
    ? Math.max(0, item.gold.total - components)
    : item.gold.base;

  return [
    `${bold("Total:")} ${item.gold.total}g`,
    `${bold("Components:")} ${components}g`,
    `${bold("Recipe:")} ${recipeCost}g`,
    `${bold("Sell:")} ${item.gold.sell}g`
  ].join("\n");
}

function formatBuildComponents(components: LeagueItemBuildComponent[]): string {
  if (components.length === 0) {
    return "*None*";
  }

  return components
    .map((component) => {
      const cost = component.totalGold === undefined ? "" : ` - ${component.totalGold}g`;
      return `• ${bold(component.name)}${cost}`;
    })
    .join("\n");
}

function formatMaps(item: LeagueItem): string {
  const knownMaps = Object.entries(item.maps)
    .filter(([mapId, enabled]) => enabled && knownMapLabels[mapId])
    .map(([mapId]) => knownMapLabels[mapId]);

  if (knownMaps.length > 0) {
    return bulletList([...new Set(knownMaps)]);
  }

  const fallbackMaps = Object.entries(item.maps)
    .filter(([, enabled]) => enabled)
    .map(([mapId]) => `Map ${mapId}`);

  return bulletList(fallbackMaps);
}

function formatCategories(item: LeagueItem): string {
  const categories = item.tags
    .map((tag) => categoryLabels[tag])
    .filter((tag): tag is string => Boolean(tag));

  return truncateDiscord(bulletList([...new Set(categories)]));
}

function sourceLabel(link: LeagueItemSourceLink): string {
  switch (link.label) {
    case "Data Dragon icon":
      return "Data Dragon Icon";
    case "Data Dragon item data":
      return "Item Data";
    case "Community Dragon raw item":
    case "Community Dragon icon":
      return "Community Dragon";
    case "Fandom legacy wiki":
      return "Fandom";
    default:
      return link.label;
  }
}

function compactSourceLinks(item: LeagueItem): string {
  const linksByLabel = new Map<string, string>();

  for (const link of item.links) {
    const label = sourceLabel(link);
    if (!linksByLabel.has(label)) {
      linksByLabel.set(label, `[${label}](${link.url})`);
    }
  }

  const firstLine = ["Data Dragon Icon", "Item Data"]
    .map((label) => linksByLabel.get(label))
    .filter(Boolean)
    .join(" • ");
  const secondLine = ["Community Dragon", "League Wiki", "Fandom"]
    .map((label) => linksByLabel.get(label))
    .filter(Boolean)
    .join(" • ");

  return truncateDiscord([firstLine, secondLine].filter(Boolean).join("\n") || "*None*");
}

function extractPassives(item: LeagueItem): PassiveSection[] {
  const description = rawDataDragonItem(item)?.description ?? "";
  const passives: PassiveSection[] = [];
  const passivePattern = /<passive>(.*?)<\/passive>\s*([^<]*(?:(?!<passive>|<active>|<rules>|<flavorText>)[\s\S])*?)(?=<passive>|<active>|<rules>|<flavorText>|$)/gi;
  let match = passivePattern.exec(description);

  while (match) {
    const name = cleanDataDragonText(match[1] ?? "");
    const text = cleanDataDragonText(match[2] ?? "");

    if (name && text) {
      passives.push({ name, text });
    }

    match = passivePattern.exec(description);
  }

  return passives;
}

function formatPassives(item: LeagueItem): string | null {
  const passives = extractPassives(item);

  if (passives.length === 0) {
    return null;
  }

  return truncateDiscord(
    passives.map((passive) => `${bold(passive.name)}\n${italic(passive.text)}`).join("\n\n")
  );
}

function itemDescription(item: LeagueItem): string {
  const lines = [
    `${bold(`${item.gold.total}g`)} total cost`,
    item.plaintext ? italic(item.plaintext) : ""
  ].filter(Boolean);

  return truncateDiscord(spacedLines(lines), discordLimits.embedDescription);
}

export function buildLeagueItemEmbed(item: LeagueItem): EmbedBuilder {
  const passives = formatPassives(item);
  const embed = new EmbedBuilder()
    .setTitle(`${gamingEmojis.attack} ${item.name}`)
    .setDescription(itemDescription(item))
    .setThumbnail(item.imageUrl)
    .setColor(leagueItemColor(item))
    .addFields(
      { name: `${gamingEmojis.gold} Gold`, value: truncateDiscord(formatGold(item)) },
      { name: `${gamingEmojis.stats} Stats`, value: formatStats(item) },
      { name: `${gamingEmojis.buildsFrom} Builds From`, value: truncateDiscord(formatBuildComponents(item.fromItems)) },
      { name: `${gamingEmojis.buildsInto} Builds Into`, value: truncateDiscord(bulletList(item.intoNames)) },
      { name: `${gamingEmojis.maps} Available On`, value: truncateDiscord(formatMaps(item)) },
      { name: `${gamingEmojis.categories} Categories`, value: formatCategories(item) }
    )
    .setFooter({ text: `RypeBot Gaming • League of Legends • Data Dragon • Item ID ${item.id}` })
    .setTimestamp();

  if (passives) {
    embed.addFields({ name: `${gamingEmojis.passives} Passives`, value: passives });
  }

  embed.addFields({ name: `${gamingEmojis.sources} Sources`, value: compactSourceLinks(item) });

  return embed;
}
