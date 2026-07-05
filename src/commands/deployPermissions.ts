import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ChannelType,
  ChatInputCommandInteraction,
  Guild,
  GuildBasedChannel,
  GuildMember,
  HexColorString,
  PermissionFlagsBits,
  PermissionResolvable,
  PermissionsBitField,
  PermissionOverwriteOptions,
  Role,
  SlashCommandBuilder
} from "discord.js";

type RoleDefinition = {
  name: string;
  color: HexColorString;
  mentionable: boolean;
  permissions: string[];
};

type RolesConfig = {
  permissionRoles: RoleDefinition[];
  interestRoles: Array<Omit<RoleDefinition, "permissions">>;
  notificationRoles: string[];
};

type PermissionsConfig = {
  readOnlyChannels: string[];
  welcomeReadChannels: string[];
  welcomeStaffPostChannels: string[];
  founderAdminPostChannels: string[];
  infoStaffPostChannels: string[];
  publicSendChannels: string[];
  communityTextChannels: string[];
  communityNewMemberSendChannels: string[];
  staffCategoryNames: string[];
  staffCommandChannels: string[];
  cannabisTextChannels: string[];
  cannabisMediaChannels: string[];
  psychedelicTextChannels: string[];
  gamingTextChannels: string[];
  competitiveTextChannels: string[];
  featuredGameChannels: Record<string, string[]>;
};

type DeploymentReport = {
  timestamp: string;
  serverName: string;
  serverId: string;
  rolesCreated: string[];
  rolesUpdated: string[];
  rolesSkipped: string[];
  categoriesUpdated: string[];
  channelsUpdated: string[];
  permissionOverwritesApplied: string[];
  permissionOverwritesSkipped: string[];
  errors: string[];
  warnings: string[];
};

type SafeApplyOverwriteResult =
  | { success: true }
  | { success: false; code: string; status: string; message: string };

const backupDirectory = path.join(process.cwd(), "backups");
const markdownReportPath = path.join(backupDirectory, "deploy-permissions-latest.md");
const jsonReportPath = path.join(backupDirectory, "deploy-permissions-latest.json");
const rolesConfigPath = path.join(process.cwd(), "config", "roles.json");
const permissionsConfigPath = path.join(process.cwd(), "config", "permissions.json");

const memberPermissions = [
  "ViewChannel",
  "SendMessages",
  "ReadMessageHistory",
  "EmbedLinks",
  "AttachFiles",
  "AddReactions",
  "UseApplicationCommands",
  "Connect",
  "Speak"
];

function markdownEscape(value: string): string {
  return value.replaceAll("|", "\\|");
}

function permissionValue(name: string): bigint {
  const value = PermissionFlagsBits[name as keyof typeof PermissionFlagsBits];

  if (value === undefined) {
    throw new Error(`Unknown Discord permission: ${name}`);
  }

  return value;
}

function permissionsFromNames(names: string[]): PermissionResolvable[] {
  return names.map(permissionValue);
}

async function loadJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function findRole(guild: Guild, name: string): Role | null {
  return guild.roles.cache.find((role) => role.name.toLowerCase() === name.toLowerCase()) ?? null;
}

function findChannel(guild: Guild, name: string): GuildBasedChannel | null {
  return guild.channels.cache.find((channel) => channel.name.toLowerCase() === name.toLowerCase()) ?? null;
}

function discordErrorDetails(error: unknown): string {
  if (!error || typeof error !== "object") {
    return error instanceof Error ? error.message : String(error);
  }

  const details = error as { code?: number | string; message?: string };
  const code = details.code === undefined ? "unknown" : String(details.code);
  const message = details.message ?? "Unknown Discord error";

  return `Discord error ${code}: ${message}`;
}

function discordErrorLogDetails(error: unknown): { code: string; status: string; message: string } {
  if (!error || typeof error !== "object") {
    return {
      code: "unknown",
      status: "unknown",
      message: error instanceof Error ? error.message : String(error)
    };
  }

  const details = error as { code?: number | string; status?: number | string; message?: string };

  return {
    code: details.code === undefined ? "unknown" : String(details.code),
    status: details.status === undefined ? "unknown" : String(details.status),
    message: details.message ?? "Unknown Discord error"
  };
}

function recordDiscordFailure(
  report: DeploymentReport,
  endpoint: string,
  targetName: string,
  error: unknown
): void {
  const details = discordErrorLogDetails(error);

  report.errors.push(
    `${endpoint} failed for ${targetName}. Discord code: ${details.code}; HTTP status: ${details.status}; message: ${details.message}`
  );
}

function permissionNames(permissions: PermissionsBitField): string[] {
  return permissions.toArray().sort((left, right) => left.localeCompare(right));
}

function logRoleDiagnostics(role: Role, botMember: GuildMember, desiredPermissions: PermissionsBitField): void {
  console.log("[deploy-permissions] Role diagnostics", {
    roleName: role.name,
    roleId: role.id,
    managed: role.managed,
    editable: role.editable,
    position: role.position,
    botHighestRole: {
      name: botMember.roles.highest.name,
      id: botMember.roles.highest.id,
      position: botMember.roles.highest.position
    },
    comparePositionToRole: botMember.roles.highest.comparePositionTo(role),
    existingPermissions: permissionNames(role.permissions),
    desiredPermissions: permissionNames(desiredPermissions)
  });
}

function canEditRole(botMember: GuildMember, role: Role, report: DeploymentReport): boolean {
  if (role.id === role.guild.id) {
    report.rolesSkipped.push(`Skipped role ${role.name} because @everyone must not be edited with RoleManager#edit.`);
    return false;
  }

  if (role.managed) {
    report.rolesSkipped.push(`Skipped role ${role.name} because this role is managed by Discord or an integration.`);
    return false;
  }

  if (botMember.roles.highest.comparePositionTo(role) <= 0) {
    report.rolesSkipped.push(`Skipped role ${role.name} because the bot role is not higher than this role.`);
    return false;
  }

  return true;
}

async function ensureRole(
  guild: Guild,
  botMember: GuildMember,
  definition: RoleDefinition,
  report: DeploymentReport
): Promise<Role | null> {
  const permissions = new PermissionsBitField(permissionsFromNames(definition.permissions));
  const role = findRole(guild, definition.name);

  if (!role) {
    try {
      const created = await guild.roles.create({
        name: definition.name,
        color: definition.color,
        mentionable: definition.mentionable,
        permissions
      });
      report.rolesCreated.push(definition.name);
      return created;
    } catch (error) {
      recordDiscordFailure(report, "guild.roles.create", definition.name, error);
      report.rolesSkipped.push(`Skipped role ${definition.name} because it could not be created. ${discordErrorDetails(error)}`);
      return null;
    }
  }

  logRoleDiagnostics(role, botMember, permissions);

  if (!canEditRole(botMember, role, report)) {
    return role;
  }

  const needsUpdate =
    role.hexColor.toLowerCase() !== definition.color.toLowerCase() ||
    role.mentionable !== definition.mentionable ||
    !role.permissions.equals(permissions);

  if (needsUpdate) {
    const payload = {
      color: definition.color,
      mentionable: definition.mentionable,
      permissions
    };

    console.log("[deploy-permissions] About to edit role", {
      roleName: role.name,
      roleId: role.id,
      payload: {
        color: payload.color,
        mentionable: payload.mentionable,
        permissions: permissionNames(payload.permissions)
      }
    });

    try {
      await role.edit(payload);
      report.rolesUpdated.push(definition.name);
    } catch (error) {
      const details = discordErrorLogDetails(error);
      console.error("[deploy-permissions] Role edit failed", {
        roleName: role.name,
        roleId: role.id,
        discordErrorCode: details.code,
        httpStatus: details.status,
        message: details.message,
        payload: {
          color: payload.color,
          mentionable: payload.mentionable,
          permissions: permissionNames(payload.permissions)
        }
      });
      recordDiscordFailure(report, "role.edit", definition.name, error);
      report.rolesSkipped.push(`Skipped role ${definition.name} because it could not be edited. ${discordErrorDetails(error)}`);
    }
  }

  return role;
}

function overwrite(label: string, allow: string[] = [], deny: string[] = []): PermissionOverwriteOptions {
  const options: PermissionOverwriteOptions = {};

  for (const permission of allow) {
    options[permission as keyof PermissionOverwriteOptions] = true;
  }

  for (const permission of deny) {
    options[permission as keyof PermissionOverwriteOptions] = false;
  }

  if (allow.length === 0 && deny.length === 0) {
    throw new Error(`Empty overwrite requested for ${label}`);
  }

  return options;
}

function canApplyOverwrites(channel: GuildBasedChannel): channel is GuildBasedChannel & {
  permissionOverwrites: {
    edit(target: Role, options: PermissionOverwriteOptions): Promise<unknown>;
  };
} {
  return "permissionOverwrites" in channel;
}

async function safeApplyOverwrite(
  channel: GuildBasedChannel,
  target: Role,
  options: PermissionOverwriteOptions
): Promise<SafeApplyOverwriteResult> {
  if (!canApplyOverwrites(channel)) {
    return {
      success: false,
      code: "unsupported_channel_type",
      status: "not_applicable",
      message: "Channel type does not support permission overwrites"
    };
  }

  try {
    await channel.permissionOverwrites.edit(target, options);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      ...discordErrorLogDetails(error)
    };
  }
}

async function ensureEveryonePermissions(
  guild: Guild,
  botMember: GuildMember,
  permissions: PermissionsBitField,
  report: DeploymentReport
): Promise<void> {
  const everyone = guild.roles.everyone;

  if (everyone.permissions.equals(permissions)) {
    return;
  }

  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    report.rolesSkipped.push("Skipped role @everyone because the bot is missing Manage Roles.");
    return;
  }

  try {
    await everyone.setPermissions(permissions);
    report.rolesUpdated.push("@everyone");
  } catch (error) {
    recordDiscordFailure(report, "guild.roles.everyone.setPermissions", "@everyone", error);
    report.rolesSkipped.push(`Skipped role @everyone because permissions could not be updated. ${discordErrorDetails(error)}`);
  }
}

async function ensureChannelOverwrites(
  guild: Guild,
  roles: Map<string, Role>,
  channelName: string,
  rules: Array<{ roleName: string; allow?: string[]; deny?: string[] }>,
  report: DeploymentReport
): Promise<void> {
  try {
    const channel = findChannel(guild, channelName);

    if (!channel) {
      report.warnings.push(`Channel not found: ${channelName}`);
      return;
    }

    let applied = false;

    for (const rule of rules) {
      const role = roles.get(rule.roleName);

      if (!role) {
        report.permissionOverwritesSkipped.push(`${channelName}: missing role ${rule.roleName}`);
        continue;
      }

      try {
        const result = await safeApplyOverwrite(channel, role, overwrite(`${channelName}:${rule.roleName}`, rule.allow, rule.deny));

        if (result.success) {
          report.permissionOverwritesApplied.push(`${channelName}: ${role.name}`);
          applied = true;
        } else {
          report.permissionOverwritesSkipped.push(
            `${channelName}: ${role.name}. Discord code: ${result.code}; HTTP status: ${result.status}; message: ${result.message}`
          );
          report.errors.push(
            `channel.permissionOverwrites.edit failed for ${channelName}/${role.name}. Discord code: ${result.code}; HTTP status: ${result.status}; message: ${result.message}`
          );
        }
      } catch (error) {
        recordDiscordFailure(report, "channel.permissionOverwrites.edit", `${channelName}/${role.name}`, error);
        report.permissionOverwritesSkipped.push(`${channelName}: ${role.name}. ${discordErrorDetails(error)}`);
      }
    }

    if (applied) {
      report.channelsUpdated.push(channelName);
    }
  } catch (error) {
    recordDiscordFailure(report, "ensureChannelOverwrites", channelName, error);
    report.errors.push(`Channel deployment failed for ${channelName}. ${discordErrorDetails(error)}`);
  }
}

async function ensureCategoryOverwrites(
  guild: Guild,
  roles: Map<string, Role>,
  categoryName: string,
  rules: Array<{ roleName: string; allow?: string[]; deny?: string[] }>,
  report: DeploymentReport
): Promise<void> {
  try {
    const category = guild.channels.cache.find(
      (channel) => channel.type === ChannelType.GuildCategory && channel.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (!category) {
      report.warnings.push(`Category not found: ${categoryName}`);
      return;
    }

    let applied = false;

    for (const rule of rules) {
      const role = roles.get(rule.roleName);

      if (!role) {
        report.permissionOverwritesSkipped.push(`${categoryName}: missing role ${rule.roleName}`);
        continue;
      }

      try {
        const result = await safeApplyOverwrite(category, role, overwrite(`${categoryName}:${rule.roleName}`, rule.allow, rule.deny));

        if (result.success) {
          report.permissionOverwritesApplied.push(`${categoryName}: ${role.name}`);
          applied = true;
        } else {
          report.permissionOverwritesSkipped.push(
            `${categoryName}: ${role.name}. Discord code: ${result.code}; HTTP status: ${result.status}; message: ${result.message}`
          );
          report.errors.push(
            `category.permissionOverwrites.edit failed for ${categoryName}/${role.name}. Discord code: ${result.code}; HTTP status: ${result.status}; message: ${result.message}`
          );
        }
      } catch (error) {
        recordDiscordFailure(report, "category.permissionOverwrites.edit", `${categoryName}/${role.name}`, error);
        report.permissionOverwritesSkipped.push(`${categoryName}: ${role.name}. ${discordErrorDetails(error)}`);
      }
    }

    if (applied) {
      report.categoriesUpdated.push(categoryName);
    }
  } catch (error) {
    recordDiscordFailure(report, "ensureCategoryOverwrites", categoryName, error);
    report.errors.push(`Category deployment failed for ${categoryName}. ${discordErrorDetails(error)}`);
  }
}

function isVoiceChannel(channel: GuildBasedChannel): boolean {
  return channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice;
}

function categoryName(channel: GuildBasedChannel): string | null {
  return "parent" in channel ? channel.parent?.name ?? null : null;
}

async function applyPolicies(guild: Guild, roles: Map<string, Role>, config: PermissionsConfig, report: DeploymentReport): Promise<void> {
  const everyone = guild.roles.everyone;
  roles.set("@everyone", everyone);

  const read = ["ViewChannel", "ReadMessageHistory"];
  const text = ["ViewChannel", "SendMessages", "ReadMessageHistory"];
  const textWithFiles = [...text, "AttachFiles"];
  const voice = ["ViewChannel", "Connect", "Speak"];
  const staff = ["Founder", "Admin", "Moderator", "RypeTech"];
  const staffNoModerator = ["Founder", "Admin", "RypeTech"];

  for (const name of config.welcomeReadChannels) {
    await ensureChannelOverwrites(guild, roles, name, [{ roleName: "@everyone", allow: read }], report);
  }

  for (const name of [...config.readOnlyChannels, ...config.welcomeStaffPostChannels, ...config.infoStaffPostChannels]) {
    await ensureChannelOverwrites(
      guild,
      roles,
      name,
      [
        { roleName: "@everyone", deny: ["SendMessages"] },
        ...staff.map((roleName) => ({ roleName, allow: text }))
      ],
      report
    );
  }

  for (const name of config.founderAdminPostChannels) {
    await ensureChannelOverwrites(
      guild,
      roles,
      name,
      [
        { roleName: "@everyone", allow: read, deny: ["SendMessages"] },
        { roleName: "Founder", allow: text },
        { roleName: "Admin", allow: text }
      ],
      report
    );
  }

  for (const name of config.publicSendChannels) {
    await ensureChannelOverwrites(
      guild,
      roles,
      name,
      [
        { roleName: "@everyone", allow: text },
        { roleName: "New Member", allow: text },
        { roleName: "Muted", deny: ["SendMessages"] }
      ],
      report
    );
  }

  for (const name of config.communityTextChannels) {
    await ensureChannelOverwrites(
      guild,
      roles,
      name,
      [
        { roleName: "Verified", allow: text },
        { roleName: "Member", allow: text },
        { roleName: "New Member", allow: read, deny: config.communityNewMemberSendChannels.includes(name) ? [] : ["SendMessages"] },
        { roleName: "Muted", deny: ["SendMessages"] }
      ],
      report
    );
  }

  for (const name of config.staffCategoryNames) {
    await ensureCategoryOverwrites(
      guild,
      roles,
      name,
      [
        { roleName: "@everyone", deny: ["ViewChannel"] },
        ...staff.map((roleName) => ({ roleName, allow: [...text, "Connect", "Speak"] })),
        { roleName: "JOB Bot", allow: ["ViewChannel", "SendMessages", "ReadMessageHistory", "ManageChannels", "ManageRoles"] }
      ],
      report
    );
  }

  for (const name of config.staffCommandChannels) {
    await ensureChannelOverwrites(
      guild,
      roles,
      name,
      [
        { roleName: "@everyone", deny: ["ViewChannel"] },
        ...staffNoModerator.map((roleName) => ({ roleName, allow: [...text, "UseApplicationCommands"] })),
        { roleName: "Moderator", deny: ["ViewChannel"] },
        { roleName: "JOB Bot", allow: [...text, "UseApplicationCommands", "ManageChannels", "ManageRoles"] }
      ],
      report
    );
  }

  for (const name of config.cannabisTextChannels) {
    await ensureChannelOverwrites(
      guild,
      roles,
      name,
      [
        { roleName: "@everyone", allow: read, deny: ["SendMessages"] },
        ...["Smoke Sesh", "Cannabis", "Verified", "Member", "Founder", "Admin", "Moderator"].map((roleName) => ({ roleName, allow: text })),
        { roleName: "Muted", deny: ["SendMessages"] }
      ],
      report
    );
  }

  for (const name of config.cannabisMediaChannels) {
    await ensureChannelOverwrites(
      guild,
      roles,
      name,
      [
        { roleName: "@everyone", allow: read, deny: ["SendMessages"] },
        ...["Smoke Sesh", "Cannabis", "Founder", "Admin", "Moderator"].map((roleName) => ({ roleName, allow: textWithFiles })),
        { roleName: "Muted", deny: ["SendMessages"] }
      ],
      report
    );
  }

  for (const name of config.psychedelicTextChannels) {
    await ensureChannelOverwrites(
      guild,
      roles,
      name,
      [
        { roleName: "@everyone", allow: read, deny: ["SendMessages"] },
        ...["Psychedelics", "Founder", "Admin", "Moderator"].map((roleName) => ({ roleName, allow: text })),
        { roleName: "Muted", deny: ["SendMessages"] }
      ],
      report
    );
  }

  for (const name of [...config.gamingTextChannels, ...config.competitiveTextChannels]) {
    await ensureChannelOverwrites(
      guild,
      roles,
      name,
      [
        { roleName: "@everyone", allow: read, deny: ["SendMessages"] },
        ...["Gamer", "Verified", "Member", "Founder", "Admin", "Moderator"].map((roleName) => ({ roleName, allow: text })),
        { roleName: "Muted", deny: ["SendMessages"] }
      ],
      report
    );
  }

  for (const channel of Object.keys(config.featuredGameChannels)) {
    const gameRoles = config.featuredGameChannels[channel] ?? [];
    await ensureChannelOverwrites(
      guild,
      roles,
      channel,
      [
        { roleName: "@everyone", allow: read, deny: ["SendMessages"] },
        ...[...gameRoles, "Gamer", "Verified", "Member", "Founder", "Admin", "Moderator"].map((roleName) => ({ roleName, allow: text })),
        { roleName: "Muted", deny: ["SendMessages"] }
      ],
      report
    );
  }

  for (const channel of guild.channels.cache.values()) {
    const parent = categoryName(channel)?.toLowerCase() ?? "";

    if (!isVoiceChannel(channel)) {
      continue;
    }

    if (parent.includes("community")) {
      await ensureChannelOverwrites(guild, roles, channel.name, [
        { roleName: "Verified", allow: voice },
        { roleName: "Member", allow: voice },
        { roleName: "Muted", deny: ["Speak"] }
      ], report);
    } else if (parent.includes("cannabis") || parent.includes("psychedelic")) {
      await ensureChannelOverwrites(guild, roles, channel.name, [
        { roleName: "@everyone", deny: ["Connect"] },
        ...["Smoke Sesh", "Cannabis", "Psychedelics", "Founder", "Admin", "Moderator"].map((roleName) => ({ roleName, allow: voice })),
        { roleName: "Muted", deny: ["Speak"] }
      ], report);
    } else if (parent.includes("gaming") || parent.includes("competitive") || parent.includes("featured")) {
      await ensureChannelOverwrites(guild, roles, channel.name, [
        ...["Gamer", "Verified", "Member", "Founder", "Admin", "Moderator"].map((roleName) => ({ roleName, allow: voice })),
        { roleName: "Muted", deny: ["Speak"] }
      ], report);
    }
  }
}

function renderList(values: string[]): string[] {
  return values.length > 0 ? values.map((value) => `- ${markdownEscape(value)}`) : ["- None"];
}

function renderMarkdownReport(report: DeploymentReport): string {
  const lines = [
    `# Deploy Permissions Report: ${markdownEscape(report.serverName)}`,
    "",
    `Timestamp: ${report.timestamp}`,
    `Server ID: ${report.serverId}`,
    "",
    "## Roles Created",
    ...renderList(report.rolesCreated),
    "",
    "## Roles Updated",
    ...renderList(report.rolesUpdated),
    "",
    "## Roles Skipped",
    ...renderList(report.rolesSkipped),
    "",
    "## Categories Updated",
    ...renderList([...new Set(report.categoriesUpdated)]),
    "",
    "## Channels Updated",
    ...renderList([...new Set(report.channelsUpdated)]),
    "",
    "## Permission Overwrites Applied",
    ...renderList(report.permissionOverwritesApplied),
    "",
    "## Permission Overwrites Skipped",
    ...renderList(report.permissionOverwritesSkipped),
    "",
    "## Warnings",
    ...renderList(report.warnings),
    "",
    "## Errors",
    ...renderList(report.errors),
    ""
  ];

  return `${lines.join("\n")}\n`;
}

async function writeDeploymentReport(report: DeploymentReport): Promise<void> {
  await mkdir(backupDirectory, { recursive: true });
  await writeFile(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownReportPath, renderMarkdownReport(report), "utf8");
}

function printDeploymentSummary(report: DeploymentReport): void {
  console.log("[deploy-permissions] Deployment summary", {
    serverName: report.serverName,
    serverId: report.serverId,
    rolesCreated: report.rolesCreated.length,
    rolesUpdated: report.rolesUpdated.length,
    rolesSkipped: report.rolesSkipped.length,
    categoriesUpdated: new Set(report.categoriesUpdated).size,
    channelsUpdated: new Set(report.channelsUpdated).size,
    overwritesApplied: report.permissionOverwritesApplied.length,
    overwritesSkipped: report.permissionOverwritesSkipped.length,
    warnings: report.warnings.length,
    errors: report.errors.length
  });
}

async function deployPermissions(guild: Guild, botMember: GuildMember): Promise<DeploymentReport> {
  const report: DeploymentReport = {
    timestamp: new Date().toISOString(),
    serverName: guild.name,
    serverId: guild.id,
    rolesCreated: [],
    rolesUpdated: [],
    rolesSkipped: [],
    categoriesUpdated: [],
    channelsUpdated: [],
    permissionOverwritesApplied: [],
    permissionOverwritesSkipped: [],
    errors: [],
    warnings: []
  };

  try {
    await guild.roles.fetch();
  } catch (error) {
    recordDiscordFailure(report, "guild.roles.fetch", guild.name, error);
    report.warnings.push(`Could not refresh roles from Discord. Continuing with cached roles. ${discordErrorDetails(error)}`);
  }

  try {
    await guild.channels.fetch();
  } catch (error) {
    recordDiscordFailure(report, "guild.channels.fetch", guild.name, error);
    report.warnings.push(`Could not refresh channels from Discord. Continuing with cached channels. ${discordErrorDetails(error)}`);
  }

  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error("Bot is missing Manage Roles permission.");
  }

  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error("Bot is missing Manage Channels permission.");
  }

  const rolesConfig = await loadJson<RolesConfig>(rolesConfigPath);
  const permissionsConfig = await loadJson<PermissionsConfig>(permissionsConfigPath);
  const roleMap = new Map<string, Role>();

  for (const definition of rolesConfig.permissionRoles) {
    try {
      const role = await ensureRole(guild, botMember, definition, report);
      if (role) {
        roleMap.set(definition.name, role);
      }
    } catch (error) {
      recordDiscordFailure(report, "ensureRole", definition.name, error);
      report.rolesSkipped.push(`Skipped role ${definition.name} because deployment failed unexpectedly. ${discordErrorDetails(error)}`);
    }
  }

  for (const definition of rolesConfig.interestRoles) {
    try {
      const role = await ensureRole(
        guild,
        botMember,
        { ...definition, permissions: memberPermissions },
        report
      );
      if (role) {
        roleMap.set(definition.name, role);
      }
    } catch (error) {
      recordDiscordFailure(report, "ensureRole", definition.name, error);
      report.rolesSkipped.push(`Skipped role ${definition.name} because deployment failed unexpectedly. ${discordErrorDetails(error)}`);
    }
  }

  for (const name of rolesConfig.notificationRoles) {
    try {
      const role = await ensureRole(
        guild,
        botMember,
        { name, color: "#64748b", mentionable: true, permissions: [] },
        report
      );
      if (role) {
        roleMap.set(name, role);
      }
    } catch (error) {
      recordDiscordFailure(report, "ensureRole", name, error);
      report.rolesSkipped.push(`Skipped role ${name} because deployment failed unexpectedly. ${discordErrorDetails(error)}`);
    }
  }

  const botRole = findRole(guild, "JOB Bot");
  if (botRole) {
    roleMap.set("JOB Bot", botRole);
  } else {
    report.warnings.push("Role not found: JOB Bot. Staff Operations bot overwrites were skipped.");
  }

  try {
    await applyPolicies(guild, roleMap, permissionsConfig, report);
  } catch (error) {
    recordDiscordFailure(report, "applyPolicies", guild.name, error);
    report.errors.push(`Permission policy deployment stopped unexpectedly. ${discordErrorDetails(error)}`);
  }
  await writeDeploymentReport(report);
  printDeploymentSummary(report);

  return report;
}

function hasInvokerPermission(interaction: ChatInputCommandInteraction): boolean {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }

  const roles = interaction.member?.roles;

  if (!roles || Array.isArray(roles)) {
    return false;
  }

  return roles.cache.some((role) => role.name === "Founder" || role.name === "Admin");
}

export const deployPermissionsCommand = {
  data: new SlashCommandBuilder()
    .setName("deploy-permissions")
    .setDescription("Apply The RypeNation roles and permission overwrites.")
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", ephemeral: true });
      return;
    }

    if (!hasInvokerPermission(interaction)) {
      await interaction.reply({ content: "You do not have permission to run this command.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const botMember = interaction.guild.members.me ?? await interaction.guild.members.fetchMe();
      const report = await deployPermissions(interaction.guild, botMember);

      await interaction.editReply(
        [
          "Permissions deployment complete.",
          `Roles created: ${report.rolesCreated.length}`,
          `Roles updated: ${report.rolesUpdated.length}`,
          `Channels updated: ${new Set(report.channelsUpdated).size}`,
          `Warnings: ${report.warnings.length}`,
          `Errors: ${report.errors.length}`,
          "Report: backups/deploy-permissions-latest.md"
        ].join("\n")
      );
    } catch (error) {
      console.error("Failed to deploy permissions:", error);
      await interaction.editReply("Permissions deployment failed. Check the bot console for details and verify the bot has Manage Roles and Manage Channels permissions.");
    }
  }
};
