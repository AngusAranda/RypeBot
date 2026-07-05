import {
  CategoryChannel,
  ChannelType,
  Guild
} from "discord.js";
import {
  entertainmentCategoryConfigs,
  entertainmentDeploymentPackageName
} from "../config/entertainmentConfig.js";
import { serverName } from "../config/serverConfig.js";

const normalize = (value: string) => value.toLowerCase();

function toDiscordChannelName(channelName: string, channelType: ChannelType.GuildText | ChannelType.GuildVoice): string {
  if (channelType === ChannelType.GuildVoice) {
    return channelName;
  }

  return channelName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

async function findOrCreateCategory(guild: Guild, categoryName: string): Promise<CategoryChannel> {
  const existingCategory = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && normalize(channel.name) === normalize(categoryName)
  ) as CategoryChannel | undefined;

  if (existingCategory) {
    console.log(`Category already exists: ${categoryName}`);
    return existingCategory;
  }

  console.log(`Creating category: ${categoryName}`);
  return guild.channels.create({
    name: categoryName,
    type: ChannelType.GuildCategory,
    reason: `Create ${serverName} ${entertainmentDeploymentPackageName} category.`
  });
}

async function ensureChannel(
  guild: Guild,
  category: CategoryChannel,
  intendedChannelName: string,
  channelType: ChannelType.GuildText | ChannelType.GuildVoice,
  topic?: string
): Promise<void> {
  const discordChannelName = toDiscordChannelName(intendedChannelName, channelType);
  const existingChannel = guild.channels.cache.find(
    (channel) =>
      channel.parentId === category.id &&
      channel.type === channelType &&
      normalize(channel.name) === normalize(discordChannelName)
  );

  if (existingChannel) {
    console.log(`Channel already exists: ${category.name} / ${discordChannelName}`);
    return;
  }

  console.log(`Creating channel: ${category.name} / ${discordChannelName}`);
  await guild.channels.create({
    name: discordChannelName,
    type: channelType,
    parent: category.id,
    topic: channelType === ChannelType.GuildText ? topic : undefined,
    reason: `Create ${serverName} ${entertainmentDeploymentPackageName} channel.`
  });
}

export async function buildEntertainmentExpansion(guild: Guild): Promise<void> {
  console.log(`Starting ${serverName} ${entertainmentDeploymentPackageName} deployment in guild: ${guild.name} (${guild.id})`);

  // This package is additive only: it creates entertainment categories and channels without removing anything.
  for (const categoryConfig of entertainmentCategoryConfigs) {
    const category = await findOrCreateCategory(guild, categoryConfig.name);

    for (const channelConfig of categoryConfig.channels) {
      await ensureChannel(
        guild,
        category,
        channelConfig.name,
        channelConfig.type,
        channelConfig.topic
      );
    }
  }

  console.log(`${serverName} ${entertainmentDeploymentPackageName} deployment completed successfully.`);
}
