import {
  CategoryChannel,
  ChannelType,
  Guild,
  OverwriteResolvable,
  PermissionFlagsBits,
  Role
} from "discord.js";
import {
  categoryConfigs,
  everyoneDenyStaffPermissions,
  roleConfigs,
  serverName,
  staffAllowPermissions,
  staffRoleNames
} from "../config/serverConfig.js";

const normalize = (value: string) => value.toLowerCase();

async function findOrCreateRole(guild: Guild, roleName: string): Promise<Role> {
  const roleConfig = roleConfigs.find((role) => role.name === roleName);
  const existingRole = guild.roles.cache.find((role) => normalize(role.name) === normalize(roleName));

  if (existingRole) {
    return existingRole;
  }

  if (!roleConfig) {
    throw new Error(`Missing role config for ${roleName}`);
  }

  console.log(`Creating role: ${roleConfig.name}`);
  return guild.roles.create({
    name: roleConfig.name,
    color: roleConfig.color,
    hoist: roleConfig.hoist ?? false,
    mentionable: roleConfig.mentionable ?? false,
    reason: roleConfig.reason
  });
}

async function ensureRoles(guild: Guild): Promise<Map<string, Role>> {
  const roleMap = new Map<string, Role>();

  for (const roleConfig of roleConfigs) {
    const role = await findOrCreateRole(guild, roleConfig.name);
    roleMap.set(roleConfig.name, role);
  }

  return roleMap;
}

function buildStaffOverwrites(guild: Guild, roleMap: Map<string, Role>): OverwriteResolvable[] {
  const overwrites: OverwriteResolvable[] = [
    {
      id: guild.roles.everyone.id,
      deny: everyoneDenyStaffPermissions
    }
  ];

  for (const staffRoleName of staffRoleNames) {
    const role = roleMap.get(staffRoleName);

    if (role) {
      overwrites.push({
        id: role.id,
        allow: staffAllowPermissions
      });
    }
  }

  return overwrites;
}

async function findOrCreateCategory(guild: Guild, categoryName: string): Promise<CategoryChannel> {
  const existingCategory = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && normalize(channel.name) === normalize(categoryName)
  ) as CategoryChannel | undefined;

  if (existingCategory) {
    return existingCategory;
  }

  console.log(`Creating category: ${categoryName}`);
  return guild.channels.create({
    name: categoryName,
    type: ChannelType.GuildCategory,
    reason: `Create ${serverName} category structure.`
  });
}

async function ensureChannel(
  guild: Guild,
  category: CategoryChannel,
  channelName: string,
  channelType: ChannelType.GuildText | ChannelType.GuildVoice,
  topic: string | undefined,
  permissionOverwrites: OverwriteResolvable[] | undefined
): Promise<void> {
  const existingChannel = guild.channels.cache.find(
    (channel) =>
      channel.parentId === category.id &&
      channel.type === channelType &&
      normalize(channel.name) === normalize(channelName)
  );

  if (existingChannel) {
    console.log(`Channel already exists: ${category.name} / ${channelName}`);
    return;
  }

  console.log(`Creating channel: ${category.name} / ${channelName}`);
  await guild.channels.create({
    name: channelName,
    type: channelType,
    parent: category.id,
    topic: channelType === ChannelType.GuildText ? topic : undefined,
    permissionOverwrites,
    reason: `Create ${serverName} server channel structure.`
  });
}

export async function buildRypeNationServer(guild: Guild): Promise<void> {
  console.log(`Starting ${serverName} deployment in guild: ${guild.name} (${guild.id})`);

  const roleMap = await ensureRoles(guild);
  const staffOverwrites = buildStaffOverwrites(guild, roleMap);

  for (const categoryConfig of categoryConfigs) {
    const category = await findOrCreateCategory(guild, categoryConfig.name);

    for (const channelConfig of categoryConfig.channels) {
      await ensureChannel(
        guild,
        category,
        channelConfig.name,
        channelConfig.type,
        channelConfig.topic,
        channelConfig.staffOnly ? staffOverwrites : undefined
      );
    }
  }

  console.log(`${serverName} deployment completed successfully.`);
}

