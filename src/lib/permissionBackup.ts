import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ChannelType,
  Guild,
  GuildBasedChannel,
  PermissionsBitField,
  Role
} from "discord.js";

export type PermissionBackupOverwrite = {
  id: string;
  type: "role" | "member";
  name: string;
  allow: string[];
  deny: string[];
};

export type PermissionBackupChannel = {
  id: string;
  name: string;
  type: string;
  position: number;
  parentId: string | null;
  parentName: string | null;
  permissionOverwrites: PermissionBackupOverwrite[];
};

export type PermissionBackup = {
  generatedAt: string;
  server: {
    id: string;
    name: string;
  };
  roles: Array<{
    id: string;
    name: string;
    position: number;
    color: string;
    managed: boolean;
    mentionable: boolean;
    permissions: string[];
  }>;
  categories: Array<PermissionBackupChannel & { children: PermissionBackupChannel[] }>;
  channels: PermissionBackupChannel[];
};

const backupDirectory = path.join(process.cwd(), "backups");

function permissionNames(permissions: PermissionsBitField): string[] {
  return permissions.toArray().sort((left, right) => left.localeCompare(right));
}

function channelTypeName(type: ChannelType): string {
  return ChannelType[type] ?? `Unknown (${type})`;
}

function timestampForFilename(date: Date): string {
  return date.toISOString().replaceAll(":", "").replaceAll(".", "-");
}

function channelPosition(channel: GuildBasedChannel): number {
  return "position" in channel ? channel.position : 0;
}

function channelParentId(channel: GuildBasedChannel): string | null {
  return "parentId" in channel ? channel.parentId : null;
}

function channelParentName(channel: GuildBasedChannel): string | null {
  return "parent" in channel ? channel.parent?.name ?? null : null;
}

function backupOverwrites(guild: Guild, channel: GuildBasedChannel): PermissionBackupOverwrite[] {
  if (!("permissionOverwrites" in channel)) {
    return [];
  }

  return channel.permissionOverwrites.cache
    .map((overwrite) => {
      const type: PermissionBackupOverwrite["type"] = overwrite.type === 0 ? "role" : "member";
      const role = type === "role" ? guild.roles.cache.get(overwrite.id) : null;
      const member = type === "member" ? guild.members.cache.get(overwrite.id) : null;

      return {
        id: overwrite.id,
        type,
        name: role?.name ?? member?.user.tag ?? "Unknown",
        allow: permissionNames(overwrite.allow),
        deny: permissionNames(overwrite.deny)
      };
    })
    .sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name));
}

function backupChannel(guild: Guild, channel: GuildBasedChannel): PermissionBackupChannel {
  return {
    id: channel.id,
    name: channel.name,
    type: channelTypeName(channel.type),
    position: channelPosition(channel),
    parentId: channelParentId(channel),
    parentName: channelParentName(channel),
    permissionOverwrites: backupOverwrites(guild, channel)
  };
}

function sortRoles(left: Role, right: Role): number {
  return right.position - left.position || left.name.localeCompare(right.name);
}

export async function createPermissionBackup(guild: Guild): Promise<{ backup: PermissionBackup; filePath: string }> {
  await guild.roles.fetch();
  await guild.channels.fetch();

  const generatedAt = new Date();
  const channels = guild.channels.cache
    .map((channel) => channel)
    .sort((left, right) => channelPosition(left) - channelPosition(right) || left.name.localeCompare(right.name));

  const backedUpChannels = channels.map((channel) => backupChannel(guild, channel));
  const categories = backedUpChannels
    .filter((channel) => channel.type === "GuildCategory")
    .map((category) => ({
      ...category,
      children: backedUpChannels.filter((channel) => channel.parentId === category.id)
    }));

  const backup: PermissionBackup = {
    generatedAt: generatedAt.toISOString(),
    server: {
      id: guild.id,
      name: guild.name
    },
    roles: guild.roles.cache
      .map((role) => ({
        id: role.id,
        name: role.name,
        position: role.position,
        color: role.hexColor,
        managed: role.managed,
        mentionable: role.mentionable,
        permissions: permissionNames(role.permissions)
      }))
      .sort((left, right) => right.position - left.position || left.name.localeCompare(right.name)),
    categories,
    channels: backedUpChannels
  };

  await mkdir(backupDirectory, { recursive: true });

  const filePath = path.join(backupDirectory, `permissions-backup-${timestampForFilename(generatedAt)}.json`);
  await writeFile(filePath, `${JSON.stringify(backup, null, 2)}\n`, "utf8");

  return { backup, filePath };
}
