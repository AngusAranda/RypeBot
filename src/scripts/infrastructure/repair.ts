import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createPermissionBackup } from "../../lib/permissionBackup.js";
import { runAdvancedPermissions } from "../../lib/advancedPermissions.js";
import { createRolePermissionsBackup, runRolePermissions } from "../../lib/rolePermissions.js";
import { buildRypeNationServer } from "../../lib/serverBuilder.js";
import { buildEntertainmentExpansion } from "../../lib/entertainmentBuilder.js";
import { withGuild } from "../discordClient.js";
import { loadDesiredState } from "./desiredState.js";
import {
  backupDirectory,
  findCategory,
  findChannelInCategory,
  findRole,
  parseOptions
} from "./shared.js";

function printList(title: string, values: string[]): void {
  console.log(`\n${title}`);
  console.log(values.length > 0 ? values.map((value) => `  - ${value}`).join("\n") : "  - None");
}

async function main(): Promise<void> {
  const options = parseOptions();

  if (options.deleteExtra) {
    console.log("--delete-extra was provided, but Infrastructure v1.0 does not delete live Discord objects automatically.");
  }

  const result = await withGuild(async (guild) => {
    await guild.roles.fetch();
    await guild.channels.fetch();
    const desiredState = await loadDesiredState();
    const missingStructure: string[] = [];

    for (const roleName of desiredState.roleNames) {
      if (!findRole(guild, roleName)) {
        missingStructure.push(`Would create role: ${roleName}`);
      }
    }

    for (const categoryName of desiredState.categoryNames) {
      if (!findCategory(guild, categoryName)) {
        missingStructure.push(`Would create category: ${categoryName}`);
      }
    }

    for (const channel of desiredState.channels) {
      if (!findChannelInCategory(guild, channel)) {
        missingStructure.push(`Would create channel: ${channel.categoryName} / ${channel.discordName}`);
      }
    }

    if (options.dryRun) {
      console.log("Repair dry-run: no Discord changes will be made.");
    } else {
      const permissionBackup = await createPermissionBackup(guild);
      const roleBackup = await createRolePermissionsBackup(guild);
      console.log(`Pre-repair permission backup: ${permissionBackup.filePath}`);
      console.log(`Pre-repair role backup: ${roleBackup.filePath}`);
      console.log("Repair mode: creating missing structure and applying permission drift fixes.");
      await buildRypeNationServer(guild);
      await buildEntertainmentExpansion(guild);
    }

    const roleReport = await runRolePermissions(guild, { dryRun: options.dryRun });
    const advancedReport = await runAdvancedPermissions(guild, { dryRun: options.dryRun });

    return { loadedDesiredStatePackages: desiredState.packageNames, missingStructure, roleReport, advancedReport };
  });

  await mkdir(backupDirectory, { recursive: true });
  const reportPath = path.join(backupDirectory, options.dryRun ? "infrastructure-repair-dry-run-latest.json" : "infrastructure-repair-latest.json");
  await writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`\nInfrastructure repair ${options.dryRun ? "dry-run" : "complete"}.`);
  console.log(`Report: ${reportPath}`);
  printList("Loaded desired-state packages", result.loadedDesiredStatePackages);
  printList("Structure actions", result.missingStructure);
  printList("Role permission changes", result.roleReport.changedRoles.map((change) => `${change.roleName}: add [${change.added.join(", ") || "none"}], remove [${change.removed.join(", ") || "none"}]`));
  printList("Advanced permission actions", result.advancedReport.plannedChanges);
  printList("Missing roles", [...result.roleReport.missingRoles, ...result.advancedReport.missingRoles]);
  printList("Missing categories", result.advancedReport.missingCategories);
  printList("Missing channels", result.advancedReport.missingChannels);
  printList("Errors", [...result.roleReport.errors, ...result.advancedReport.errors]);

  const failed = result.roleReport.missingRoles.length > 0 ||
    result.roleReport.skippedRoles.length > 0 ||
    result.roleReport.errors.length > 0 ||
    result.advancedReport.missingRoles.length > 0 ||
    result.advancedReport.missingCategories.length > 0 ||
    result.advancedReport.missingChannels.length > 0 ||
    result.advancedReport.errors.length > 0;

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Infrastructure repair failed:", error);
  process.exit(1);
});
