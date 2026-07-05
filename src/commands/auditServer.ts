import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ChannelType,
  ChatInputCommandInteraction,
  Guild,
  GuildBasedChannel,
  GuildMember,
  PermissionFlagsBits,
  PermissionsBitField,
  SlashCommandBuilder
} from "discord.js";

type AuditRole = {
  id: string;
  name: string;
  position: number;
  color: string;
  managed: boolean;
  mentionable: boolean;
  permissions: string[];
  hasAdministrator: boolean;
};

type AuditOverwrite = {
  id: string;
  type: "role" | "member";
  name: string;
  allow: string[];
  deny: string[];
};

type AuditChannel = {
  id: string;
  name: string;
  type: string;
  position: number;
  parentId: string | null;
  parentName: string | null;
  permissionOverwrites: AuditOverwrite[];
};

type AuditCategory = {
  id: string;
  name: string;
  position: number;
  permissionOverwrites: AuditOverwrite[];
  textChannels: AuditChannel[];
  voiceChannels: AuditChannel[];
};

type ServerAudit = {
  generatedAt: string;
  server: {
    id: string;
    name: string;
  };
  botPermissions: {
    manageRoles: boolean;
    manageChannels: boolean;
    highestRolePosition: number | null;
    highestRoleName: string | null;
  };
  warnings: string[];
  roles: AuditRole[];
  categories: AuditCategory[];
  uncategorized: {
    textChannels: AuditChannel[];
    voiceChannels: AuditChannel[];
  };
};

const backupDirectory = path.join(process.cwd(), "backups");
const markdownAuditPath = path.join(backupDirectory, "server-audit-latest.md");
const jsonAuditPath = path.join(backupDirectory, "server-audit-latest.json");

function permissionNames(permissions: PermissionsBitField): string[] {
  return permissions.toArray().sort((left, right) => left.localeCompare(right));
}

function markdownEscape(value: string): string {
  return value.replaceAll("|", "\\|");
}

function channelTypeName(type: ChannelType): string {
  return ChannelType[type] ?? `Unknown (${type})`;
}

function isTextAuditChannel(channel: GuildBasedChannel): boolean {
  return [
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement,
    ChannelType.GuildForum,
    ChannelType.GuildMedia
  ].includes(channel.type);
}

function isVoiceAuditChannel(channel: GuildBasedChannel): boolean {
  return [
    ChannelType.GuildVoice,
    ChannelType.GuildStageVoice
  ].includes(channel.type);
}

function auditOverwrites(guild: Guild, channel: GuildBasedChannel): AuditOverwrite[] {
  if (!("permissionOverwrites" in channel)) {
    return [];
  }

  return channel.permissionOverwrites.cache
    .map((overwrite) => {
      const type: AuditOverwrite["type"] = overwrite.type === 0 ? "role" : "member";
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
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type.localeCompare(right.type);
      }

      return left.name.localeCompare(right.name);
    });
}

function auditChannel(guild: Guild, channel: GuildBasedChannel): AuditChannel {
  return {
    id: channel.id,
    name: channel.name,
    type: channelTypeName(channel.type),
    position: "position" in channel ? channel.position : 0,
    parentId: "parentId" in channel ? channel.parentId : null,
    parentName: "parent" in channel ? channel.parent?.name ?? null : null,
    permissionOverwrites: auditOverwrites(guild, channel)
  };
}

function renderOverwrite(overwrite: AuditOverwrite): string {
  const allow = overwrite.allow.length > 0 ? overwrite.allow.join(", ") : "None";
  const deny = overwrite.deny.length > 0 ? overwrite.deny.join(", ") : "None";

  return `  - ${overwrite.type}: ${markdownEscape(overwrite.name)} (${overwrite.id}) - allow: ${allow}; deny: ${deny}`;
}

function renderChannel(channel: AuditChannel): string[] {
  const lines = [`- #${markdownEscape(channel.name)} (${channel.type}, ${channel.id})`];

  if (channel.permissionOverwrites.length === 0) {
    lines.push("  - Permission overwrites: none");
    return lines;
  }

  lines.push("  - Permission overwrites:");
  lines.push(...channel.permissionOverwrites.map(renderOverwrite));
  return lines;
}

function renderChannelGroup(title: string, channels: AuditChannel[]): string[] {
  if (channels.length === 0) {
    return [`**${title}:** none`];
  }

  return [`**${title}:**`, ...channels.flatMap(renderChannel)];
}

function renderMarkdown(audit: ServerAudit): string {
  const lines: string[] = [
    `# Server Audit: ${markdownEscape(audit.server.name)}`,
    "",
    `Generated: ${audit.generatedAt}`,
    `Server ID: ${audit.server.id}`,
    "",
    "## Bot Permission Check",
    "",
    `- Manage Roles: ${audit.botPermissions.manageRoles ? "yes" : "no"}`,
    `- Manage Channels: ${audit.botPermissions.manageChannels ? "yes" : "no"}`,
    `- Highest Bot Role: ${audit.botPermissions.highestRoleName ?? "Unknown"} (${audit.botPermissions.highestRolePosition ?? "Unknown"})`,
    "",
    "## Warnings",
    "",
    ...(audit.warnings.length > 0 ? audit.warnings.map((warning) => `- ${warning}`) : ["- None"]),
    "",
    "## Roles By Hierarchy",
    "",
    "| Position | Name | ID | Managed | Mentionable | Administrator | Permissions |",
    "| ---: | --- | --- | --- | --- | --- | --- |",
    ...audit.roles.map((role) =>
      `| ${role.position} | ${markdownEscape(role.name)} | ${role.id} | ${role.managed ? "yes" : "no"} | ${role.mentionable ? "yes" : "no"} | ${role.hasAdministrator ? "yes" : "no"} | ${role.permissions.join(", ") || "None"} |`
    ),
    "",
    "## Categories And Channels",
    ""
  ];

  for (const category of audit.categories) {
    lines.push(`### ${markdownEscape(category.name)} (${category.id})`);
    lines.push("");

    if (category.permissionOverwrites.length === 0) {
      lines.push("**Category permission overwrites:** none");
    } else {
      lines.push("**Category permission overwrites:**");
      lines.push(...category.permissionOverwrites.map(renderOverwrite));
    }

    lines.push("");
    lines.push(...renderChannelGroup("Text channels", category.textChannels));
    lines.push("");
    lines.push(...renderChannelGroup("Voice channels", category.voiceChannels));
    lines.push("");
  }

  lines.push("## Uncategorized Channels");
  lines.push("");
  lines.push(...renderChannelGroup("Text channels", audit.uncategorized.textChannels));
  lines.push("");
  lines.push(...renderChannelGroup("Voice channels", audit.uncategorized.voiceChannels));
  lines.push("");

  return `${lines.join("\n")}\n`;
}

async function createServerAudit(guild: Guild, botMember: GuildMember): Promise<ServerAudit> {
  await guild.roles.fetch();
  await guild.channels.fetch();

  const roles = guild.roles.cache
    .map((role) => ({
      id: role.id,
      name: role.name,
      position: role.position,
      color: role.hexColor,
      managed: role.managed,
      mentionable: role.mentionable,
      permissions: permissionNames(role.permissions),
      hasAdministrator: role.permissions.has(PermissionFlagsBits.Administrator)
    }))
    .sort((left, right) => right.position - left.position || left.name.localeCompare(right.name));

  const manageableBlockedRoles = guild.roles.cache
    .filter((role) => role.id !== guild.id && !role.managed && role.comparePositionTo(botMember.roles.highest) >= 0)
    .sort((left, right) => right.position - left.position || left.name.localeCompare(right.name));

  const warnings: string[] = [];

  if (manageableBlockedRoles.size > 0) {
    warnings.push(
      `Bot role is not high enough to manage ${manageableBlockedRoles.size} role(s): ${manageableBlockedRoles.map((role) => role.name).join(", ")}.`
    );
  }

  const administratorRoles = roles.filter((role) => role.hasAdministrator && role.id !== guild.id);

  for (const role of administratorRoles) {
    warnings.push(`Role "${role.name}" has Administrator permission.`);
  }

  const channels = guild.channels.cache
    .map((channel) => channel)
    .sort((left, right) => {
      const leftPosition = "position" in left ? left.position : 0;
      const rightPosition = "position" in right ? right.position : 0;

      return leftPosition - rightPosition || left.name.localeCompare(right.name);
    });

  const textChannels = channels.filter(isTextAuditChannel).map((channel) => auditChannel(guild, channel));
  const voiceChannels = channels.filter(isVoiceAuditChannel).map((channel) => auditChannel(guild, channel));
  const uncategorizedTextChannels = textChannels.filter((channel) => !channel.parentId);
  const uncategorizedVoiceChannels = voiceChannels.filter((channel) => !channel.parentId);

  if (uncategorizedTextChannels.length > 0 || uncategorizedVoiceChannels.length > 0) {
    warnings.push(
      `Found ${uncategorizedTextChannels.length + uncategorizedVoiceChannels.length} uncategorized channel(s).`
    );
  }

  const categories = channels
    .filter((channel) => channel.type === ChannelType.GuildCategory)
    .map((category) => ({
      id: category.id,
      name: category.name,
      position: "position" in category ? category.position : 0,
      permissionOverwrites: auditOverwrites(guild, category),
      textChannels: textChannels.filter((channel) => channel.parentId === category.id),
      voiceChannels: voiceChannels.filter((channel) => channel.parentId === category.id)
    }));

  const botPermissions = botMember.permissions;

  return {
    generatedAt: new Date().toISOString(),
    server: {
      id: guild.id,
      name: guild.name
    },
    botPermissions: {
      manageRoles: botPermissions.has(PermissionFlagsBits.ManageRoles),
      manageChannels: botPermissions.has(PermissionFlagsBits.ManageChannels),
      highestRolePosition: botMember.roles.highest?.position ?? null,
      highestRoleName: botMember.roles.highest?.name ?? null
    },
    warnings,
    roles,
    categories,
    uncategorized: {
      textChannels: uncategorizedTextChannels,
      voiceChannels: uncategorizedVoiceChannels
    }
  };
}

export const auditServerCommand = {
  data: new SlashCommandBuilder()
    .setName("audit-server")
    .setDescription("Create a read-only audit of this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", ephemeral: true });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "Only administrators can use /audit-server.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const botMember = interaction.guild.members.me ?? await interaction.guild.members.fetchMe();
      const audit = await createServerAudit(interaction.guild, botMember);

      await mkdir(backupDirectory, { recursive: true });
      await writeFile(jsonAuditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
      await writeFile(markdownAuditPath, renderMarkdown(audit), "utf8");

      await interaction.editReply(
        `Server audit complete. Wrote backups/server-audit-latest.md and backups/server-audit-latest.json. Warnings: ${audit.warnings.length}.`
      );
    } catch (error) {
      console.error("Failed to audit server:", error);
      await interaction.editReply("Server audit failed. Check the bot console for details.");
    }
  }
};
