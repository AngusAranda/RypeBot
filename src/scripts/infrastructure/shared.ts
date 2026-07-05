import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  ChannelType,
  Guild,
  GuildBasedChannel,
  PermissionFlagsBits,
  PermissionOverwriteOptions,
  PermissionsBitField,
  Role
} from "discord.js";
import type { DesiredChannel } from "./desiredState.js";

export type CliOptions = {
  dryRun: boolean;
  deleteExtra: boolean;
};

export const backupDirectory = path.join(process.cwd(), "backups");

export function parseOptions(): CliOptions {
  return {
    dryRun: process.argv.includes("--dry-run"),
    deleteExtra: process.argv.includes("--delete-extra")
  };
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function namesMatch(actual: string, expected: string): boolean {
  const normalizedActual = normalizeName(actual);
  const normalizedExpected = normalizeName(expected);

  return normalizedActual === normalizedExpected ||
    normalizedActual.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedActual);
}

export function toDiscordChannelName(channelName: string, channelType: ChannelType.GuildText | ChannelType.GuildVoice): string {
  if (channelType === ChannelType.GuildVoice) {
    return channelName;
  }

  return channelName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export function findRole(guild: Guild, name: string): Role | null {
  if (name === "@everyone") {
    return guild.roles.everyone;
  }

  return guild.roles.cache.find((role) => namesMatch(role.name, name)) ?? null;
}

export function findCategory(guild: Guild, name: string): GuildBasedChannel | null {
  return guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && namesMatch(channel.name, name)
  ) ?? null;
}

export function findChannelInCategory(guild: Guild, expected: DesiredChannel): GuildBasedChannel | null {
  const category = findCategory(guild, expected.categoryName);

  return guild.channels.cache.find(
    (channel) =>
      channel.type === expected.type &&
      "parentId" in channel &&
      channel.parentId === category?.id &&
      namesMatch(channel.name, expected.discordName)
  ) ?? null;
}

export function permissionNames(permissions: PermissionsBitField): string[] {
  return permissions.toArray().sort((left, right) => left.localeCompare(right));
}

export function overwriteOptions(allow: string[], deny: string[]): PermissionOverwriteOptions {
  const options: PermissionOverwriteOptions = {};

  for (const permission of allow) {
    options[permission as keyof PermissionOverwriteOptions] = true;
  }

  for (const permission of deny) {
    options[permission as keyof PermissionOverwriteOptions] = false;
  }

  return options;
}

export async function latestBackupPath(prefix: string): Promise<string | null> {
  const files = await readdir(backupDirectory).catch(() => []);
  const matches = files
    .filter((file) => file.startsWith(prefix) && file.endsWith(".json"))
    .sort((left, right) => right.localeCompare(left));

  return matches[0] ? path.join(backupDirectory, matches[0]) : null;
}

export function assertCanManage(guild: Guild, action: "roles" | "channels"): void {
  const botMember = guild.members.me;
  const permission = action === "roles" ? PermissionFlagsBits.ManageRoles : PermissionFlagsBits.ManageChannels;

  if (!botMember?.permissions.has(permission)) {
    throw new Error(`Bot is missing Manage ${action === "roles" ? "Roles" : "Channels"} permission.`);
  }
}
