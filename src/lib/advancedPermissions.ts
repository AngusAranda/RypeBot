import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  ChannelType,
  Guild,
  GuildBasedChannel,
  PermissionFlagsBits,
  PermissionOverwriteOptions,
  Role
} from "discord.js";

type PermissionRule = {
  roleName: string;
  allow?: string[];
  deny?: string[];
};

type CategoryPolicy = {
  name: string;
  profile: string;
  syncChildren?: boolean;
};

type ChannelException = {
  name: string;
  profile?: string;
  overwrites?: PermissionRule[];
  reason?: string;
};

type AdvancedPermissionsConfig = {
  profiles: Record<string, PermissionRule[]>;
  categories: CategoryPolicy[];
  channelExceptions: ChannelException[];
};

export type AdvancedPermissionsReport = {
  mode: "dry-run" | "deploy";
  timestamp: string;
  serverName: string;
  serverId: string;
  categoriesChanged: string[];
  channelsSynced: string[];
  channelExceptionsChanged: string[];
  plannedChanges: string[];
  missingRoles: string[];
  missingCategories: string[];
  missingChannels: string[];
  errors: string[];
};

const advancedPermissionsConfigPath = path.join(process.cwd(), "config", "advanced-permissions.json");

async function loadConfig(): Promise<AdvancedPermissionsConfig> {
  return JSON.parse(await readFile(advancedPermissionsConfigPath, "utf8")) as AdvancedPermissionsConfig;
}

function findRole(guild: Guild, name: string): Role | null {
  if (name === "@everyone") {
    return guild.roles.everyone;
  }

  return guild.roles.cache.find((role) => role.name.toLowerCase() === name.toLowerCase()) ?? null;
}

function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function namesMatch(actual: string, expected: string): boolean {
  const normalizedActual = normalizeName(actual);
  const normalizedExpected = normalizeName(expected);

  return normalizedActual === normalizedExpected ||
    normalizedActual.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedActual);
}

function findCategory(guild: Guild, name: string): GuildBasedChannel | null {
  return guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && namesMatch(channel.name, name)
  ) ?? null;
}

function findChannel(guild: Guild, name: string): GuildBasedChannel | null {
  return guild.channels.cache.find((channel) => namesMatch(channel.name, name)) ?? null;
}

function childrenOf(guild: Guild, categoryId: string): GuildBasedChannel[] {
  return guild.channels.cache
    .filter((channel) => "parentId" in channel && channel.parentId === categoryId)
    .map((channel) => channel)
    .sort((left, right) => {
      const leftPosition = "position" in left ? left.position : 0;
      const rightPosition = "position" in right ? right.position : 0;
      return leftPosition - rightPosition || left.name.localeCompare(right.name);
    });
}

function overwriteOptions(rule: PermissionRule): PermissionOverwriteOptions {
  const options: PermissionOverwriteOptions = {};

  for (const permission of rule.allow ?? []) {
    options[permission as keyof PermissionOverwriteOptions] = true;
  }

  for (const permission of rule.deny ?? []) {
    options[permission as keyof PermissionOverwriteOptions] = false;
  }

  return options;
}

function rulesForProfile(config: AdvancedPermissionsConfig, profileName: string, report: AdvancedPermissionsReport): PermissionRule[] {
  const profile = config.profiles[profileName];

  if (!profile) {
    report.errors.push(`Permission profile not found in config: ${profileName}`);
    return [];
  }

  return profile;
}

function resolveRules(config: AdvancedPermissionsConfig, exception: ChannelException, report: AdvancedPermissionsReport): PermissionRule[] {
  if (exception.overwrites) {
    return exception.overwrites;
  }

  if (!exception.profile) {
    report.errors.push(`Channel exception ${exception.name} needs either profile or overwrites.`);
    return [];
  }

  return rulesForProfile(config, exception.profile, report);
}

function validateRules(guild: Guild, label: string, rules: PermissionRule[], report: AdvancedPermissionsReport): void {
  for (const rule of rules) {
    if (!findRole(guild, rule.roleName)) {
      report.missingRoles.push(`${label}: ${rule.roleName}`);
    }
  }
}

function canEditOverwrites(channel: GuildBasedChannel): channel is GuildBasedChannel & {
  permissionOverwrites: {
    edit(target: Role, options: PermissionOverwriteOptions): Promise<unknown>;
  };
} {
  return "permissionOverwrites" in channel;
}

function canSyncPermissions(channel: GuildBasedChannel): channel is GuildBasedChannel & {
  lockPermissions(): Promise<unknown>;
} {
  return "lockPermissions" in channel;
}

async function applyRules(
  guild: Guild,
  channel: GuildBasedChannel,
  label: string,
  rules: PermissionRule[],
  dryRun: boolean,
  report: AdvancedPermissionsReport
): Promise<void> {
  if (!canEditOverwrites(channel)) {
    report.errors.push(`${label} does not support permission overwrites.`);
    return;
  }

  for (const rule of rules) {
    const role = findRole(guild, rule.roleName);

    if (!role) {
      report.errors.push(`${label}: role disappeared before deployment: ${rule.roleName}`);
      continue;
    }

    report.plannedChanges.push(`${dryRun ? "Would apply" : "Apply"} ${label} overwrite for ${rule.roleName}`);

    if (!dryRun) {
      await channel.permissionOverwrites.edit(role, overwriteOptions(rule));
    }
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function hasSafetyProblems(report: AdvancedPermissionsReport): boolean {
  report.missingRoles = unique(report.missingRoles);
  report.missingCategories = unique(report.missingCategories);
  report.missingChannels = unique(report.missingChannels);

  return report.missingRoles.length > 0 || report.missingCategories.length > 0 || report.missingChannels.length > 0 || report.errors.length > 0;
}

export async function runAdvancedPermissions(guild: Guild, options: { dryRun: boolean }): Promise<AdvancedPermissionsReport> {
  await guild.roles.fetch();
  await guild.channels.fetch();

  const botMember = guild.members.me ?? await guild.members.fetchMe();

  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error("Bot is missing Manage Channels permission.");
  }

  const config = await loadConfig();
  const report: AdvancedPermissionsReport = {
    mode: options.dryRun ? "dry-run" : "deploy",
    timestamp: new Date().toISOString(),
    serverName: guild.name,
    serverId: guild.id,
    categoriesChanged: [],
    channelsSynced: [],
    channelExceptionsChanged: [],
    plannedChanges: [],
    missingRoles: [],
    missingCategories: [],
    missingChannels: [],
    errors: []
  };

  const categoryTargets = config.categories.map((categoryPolicy) => ({
    policy: categoryPolicy,
    category: findCategory(guild, categoryPolicy.name),
    rules: rulesForProfile(config, categoryPolicy.profile, report)
  }));

  for (const target of categoryTargets) {
    if (!target.category) {
      report.missingCategories.push(target.policy.name);
      continue;
    }

    validateRules(guild, `Category ${target.policy.name}`, target.rules, report);
  }

  const exceptionTargets = config.channelExceptions.map((exception) => ({
    exception,
    channel: findChannel(guild, exception.name),
    rules: resolveRules(config, exception, report)
  }));

  for (const target of exceptionTargets) {
    if (!target.channel) {
      report.missingChannels.push(target.exception.name);
      continue;
    }

    validateRules(guild, `Channel ${target.exception.name}`, target.rules, report);
  }

  const unsafe = hasSafetyProblems(report);

  if (unsafe) {
    report.plannedChanges.push("Safety check failed. No permission changes were applied.");
    return report;
  }

  for (const target of categoryTargets) {
    if (!target.category) {
      continue;
    }

    await applyRules(guild, target.category, `category ${target.policy.name}`, target.rules, options.dryRun, report);
    report.categoriesChanged.push(target.policy.name);

    if (target.policy.syncChildren) {
      for (const child of childrenOf(guild, target.category.id)) {
        const isException = exceptionTargets.some((exceptionTarget) => exceptionTarget.channel?.id === child.id);

        if (isException) {
          continue;
        }

        report.plannedChanges.push(`${options.dryRun ? "Would sync" : "Sync"} #${child.name} to ${target.policy.name}`);

        if (!options.dryRun) {
          if (!canSyncPermissions(child)) {
            report.errors.push(`#${child.name} cannot sync permissions from its parent category.`);
            continue;
          }

          await child.lockPermissions();
        }

        report.channelsSynced.push(child.name);
      }
    }
  }

  for (const target of exceptionTargets) {
    if (!target.channel) {
      continue;
    }

    await applyRules(guild, target.channel, `channel ${target.exception.name}`, target.rules, options.dryRun, report);
    report.channelExceptionsChanged.push(target.exception.name);
  }

  return report;
}
