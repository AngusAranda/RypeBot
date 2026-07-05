import { readFile } from "node:fs/promises";
import {
  ChannelType,
  GuildBasedChannel,
  PermissionResolvable,
  PermissionsBitField,
  Role
} from "discord.js";
import { PermissionBackup } from "../../lib/permissionBackup.js";
import { withGuild } from "../discordClient.js";
import {
  latestBackupPath,
  overwriteOptions,
  parseOptions,
  permissionNames
} from "./shared.js";

function findEditableRole(roles: Map<string, Role>, backupRole: PermissionBackup["roles"][number]): Role | null {
  return roles.get(backupRole.id) ?? [...roles.values()].find((role) => role.name === backupRole.name) ?? null;
}

function findWritableChannel(channels: Map<string, GuildBasedChannel>, backupChannel: PermissionBackup["channels"][number]): GuildBasedChannel | null {
  return channels.get(backupChannel.id) ?? [...channels.values()].find((channel) => channel.name === backupChannel.name) ?? null;
}

async function main(): Promise<void> {
  const options = parseOptions();
  const backupPath = await latestBackupPath("permissions-backup-");

  if (!backupPath) {
    console.error("Rollback failed safely: no permissions-backup-*.json file exists in backups.");
    process.exit(1);
  }

  const backup = JSON.parse(await readFile(backupPath, "utf8")) as PermissionBackup;
  const changes: string[] = [];
  const skipped: string[] = [];

  await withGuild(async (guild) => {
    await guild.roles.fetch();
    await guild.channels.fetch();

    const roles = new Map(guild.roles.cache.map((role) => [role.id, role]));
    const channels = new Map(guild.channels.cache.map((channel) => [channel.id, channel]));

    for (const backupRole of backup.roles) {
      const role = findEditableRole(roles, backupRole);

      if (!role) {
        skipped.push(`Missing live role: ${backupRole.name}`);
        continue;
      }

      if (role.managed || role.id === guild.id) {
        skipped.push(`Skipped managed/server role: ${role.name}`);
        continue;
      }

      const desired = new PermissionsBitField(backupRole.permissions as PermissionResolvable[]);
      if (!role.permissions.equals(desired)) {
        changes.push(`Restore role permissions: ${role.name}`);

        if (!options.dryRun) {
          await role.setPermissions(desired, "RypeBot infrastructure rollback");
        }
      }
    }

    for (const backupChannel of backup.channels) {
      const channel = findWritableChannel(channels, backupChannel);

      if (!channel || !("permissionOverwrites" in channel)) {
        skipped.push(`Missing or unsupported live channel: ${backupChannel.name}`);
        continue;
      }

      for (const overwrite of backupChannel.permissionOverwrites) {
        if (overwrite.type !== "role") {
          skipped.push(`Skipped member overwrite on ${backupChannel.name}: ${overwrite.name}`);
          continue;
        }

        const target = guild.roles.cache.get(overwrite.id) ?? guild.roles.cache.find((role) => role.name === overwrite.name);

        if (!target) {
          skipped.push(`Missing overwrite target on ${backupChannel.name}: ${overwrite.name}`);
          continue;
        }

        const current = channel.permissionOverwrites.cache.get(target.id);
        const currentAllow = current ? permissionNames(current.allow) : [];
        const currentDeny = current ? permissionNames(current.deny) : [];

        if (currentAllow.join(",") !== overwrite.allow.join(",") || currentDeny.join(",") !== overwrite.deny.join(",")) {
          changes.push(`Restore channel overwrite: ${backupChannel.name} / ${target.name}`);

          if (!options.dryRun) {
            await channel.permissionOverwrites.edit(target, overwriteOptions(overwrite.allow, overwrite.deny));
          }
        }
      }
    }
  });

  console.log(`Rollback ${options.dryRun ? "dry-run" : "complete"}.`);
  console.log(`Backup used: ${backupPath}`);
  console.log("\nChanges");
  console.log(changes.length > 0 ? changes.map((change) => `  - ${change}`).join("\n") : "  - None");
  console.log("\nSkipped");
  console.log(skipped.length > 0 ? skipped.map((item) => `  - ${item}`).join("\n") : "  - None");
}

main().catch((error) => {
  console.error("Infrastructure rollback failed:", error);
  process.exit(1);
});
