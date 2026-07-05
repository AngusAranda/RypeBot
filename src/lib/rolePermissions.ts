import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  Guild,
  PermissionFlagsBits,
  PermissionsBitField,
  Role
} from "discord.js";

type RolePermissionDefinition = {
  allowAdministrator?: boolean;
  permissions: string[];
};

type RolePermissionsConfig = {
  allowEveryoneEdit?: boolean;
  roles: Record<string, RolePermissionDefinition>;
};

export type RolePermissionChange = {
  roleName: string;
  roleId: string;
  currentBitfield: string;
  desiredBitfield: string;
  added: string[];
  removed: string[];
};

export type RolePermissionSkip = {
  roleName: string;
  reason: string;
};

export type RolePermissionsReport = {
  mode: "dry-run" | "deploy";
  timestamp: string;
  serverName: string;
  serverId: string;
  changedRoles: RolePermissionChange[];
  unchangedRoles: string[];
  missingRoles: string[];
  skippedRoles: RolePermissionSkip[];
  errors: string[];
};

export type RolePermissionsBackup = {
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
    editable: boolean;
    permissionsBitfield: string;
    permissions: string[];
  }>;
};

const rolePermissionsConfigPath = path.join(process.cwd(), "config", "role-permissions.json");
const backupDirectory = path.join(process.cwd(), "backups");

function timestampForFilename(date: Date): string {
  return date.toISOString().replaceAll(":", "").replaceAll(".", "-");
}

function permissionNames(permissions: PermissionsBitField): string[] {
  return permissions.toArray().sort((left, right) => left.localeCompare(right));
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function findRoleByExactName(guild: Guild, name: string): Role | null {
  if (name === "@everyone") {
    return guild.roles.everyone;
  }

  return guild.roles.cache.find((role) => role.name === name) ?? null;
}

function permissionFlag(permissionName: string): bigint | null {
  const flags = PermissionFlagsBits as Record<string, bigint>;
  return flags[permissionName] ?? null;
}

function desiredPermissions(definition: RolePermissionDefinition, roleName: string, report: RolePermissionsReport): PermissionsBitField | null {
  const flags: bigint[] = [];

  for (const permissionName of definition.permissions) {
    const flag = permissionFlag(permissionName);

    if (flag === null) {
      report.errors.push(`${roleName}: unknown permission ${permissionName}`);
      continue;
    }

    if (permissionName === "Administrator" && !definition.allowAdministrator) {
      report.errors.push(`${roleName}: Administrator requires allowAdministrator: true`);
      continue;
    }

    flags.push(flag);
  }

  if (flags.length !== definition.permissions.length) {
    return null;
  }

  return new PermissionsBitField(flags);
}

function rolePositionIsBlocked(role: Role, botHighestRole: Role): boolean {
  if (role.id === role.guild.roles.everyone.id) {
    return false;
  }

  return botHighestRole.comparePositionTo(role) <= 0;
}

async function loadConfig(): Promise<RolePermissionsConfig> {
  return JSON.parse(await readFile(rolePermissionsConfigPath, "utf8")) as RolePermissionsConfig;
}

export function hasRolePermissionSafetyProblems(report: RolePermissionsReport): boolean {
  return report.missingRoles.length > 0 || report.skippedRoles.length > 0 || report.errors.length > 0;
}

export async function createRolePermissionsBackup(guild: Guild): Promise<{ backup: RolePermissionsBackup; filePath: string }> {
  await guild.roles.fetch();

  const generatedAt = new Date();
  const backup: RolePermissionsBackup = {
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
        editable: role.editable,
        permissionsBitfield: role.permissions.bitfield.toString(),
        permissions: permissionNames(role.permissions)
      }))
      .sort((left, right) => right.position - left.position || left.name.localeCompare(right.name))
  };

  await mkdir(backupDirectory, { recursive: true });

  const filePath = path.join(backupDirectory, `role-permissions-backup-${timestampForFilename(generatedAt)}.json`);
  await writeFile(filePath, `${JSON.stringify(backup, null, 2)}\n`, "utf8");

  return { backup, filePath };
}

export async function runRolePermissions(guild: Guild, options: { dryRun: boolean }): Promise<RolePermissionsReport> {
  await guild.roles.fetch();

  const botMember = guild.members.me ?? await guild.members.fetchMe();

  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error("Bot is missing Manage Roles permission.");
  }

  const config = await loadConfig();
  const report: RolePermissionsReport = {
    mode: options.dryRun ? "dry-run" : "deploy",
    timestamp: new Date().toISOString(),
    serverName: guild.name,
    serverId: guild.id,
    changedRoles: [],
    unchangedRoles: [],
    missingRoles: [],
    skippedRoles: [],
    errors: []
  };

  const targets = Object.entries(config.roles).map(([roleName, definition]) => ({
    roleName,
    definition,
    role: findRoleByExactName(guild, roleName)
  }));

  for (const target of targets) {
    if (!target.role) {
      report.missingRoles.push(target.roleName);
      continue;
    }

    if (target.role.id === guild.roles.everyone.id && !config.allowEveryoneEdit) {
      report.skippedRoles.push({
        roleName: target.roleName,
        reason: "@everyone requires allowEveryoneEdit: true"
      });
      continue;
    }

    if (target.role.managed) {
      report.skippedRoles.push({
        roleName: target.roleName,
        reason: "Managed integration roles cannot be edited"
      });
      continue;
    }

    if (rolePositionIsBlocked(target.role, botMember.roles.highest)) {
      report.skippedRoles.push({
        roleName: target.roleName,
        reason: "Role is above or equal to the bot role"
      });
      continue;
    }

    desiredPermissions(target.definition, target.roleName, report);
  }

  report.missingRoles = unique(report.missingRoles);

  if (hasRolePermissionSafetyProblems(report)) {
    return report;
  }

  for (const target of targets) {
    if (!target.role) {
      continue;
    }

    const desired = desiredPermissions(target.definition, target.roleName, report);

    if (!desired) {
      continue;
    }

    const currentNames = permissionNames(target.role.permissions);
    const desiredNames = permissionNames(desired);
    const added = desiredNames.filter((permissionName) => !currentNames.includes(permissionName));
    const removed = currentNames.filter((permissionName) => !desiredNames.includes(permissionName));

    if (added.length === 0 && removed.length === 0) {
      report.unchangedRoles.push(target.roleName);
      continue;
    }

    const change: RolePermissionChange = {
      roleName: target.roleName,
      roleId: target.role.id,
      currentBitfield: target.role.permissions.bitfield.toString(),
      desiredBitfield: desired.bitfield.toString(),
      added,
      removed
    };

    report.changedRoles.push(change);

    if (!options.dryRun) {
      await target.role.setPermissions(desired, "RypeBot role permissions deployment");
    }
  }

  report.unchangedRoles = unique(report.unchangedRoles);

  return report;
}
