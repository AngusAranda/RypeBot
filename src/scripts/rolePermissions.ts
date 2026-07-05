import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createRolePermissionsBackup,
  hasRolePermissionSafetyProblems,
  runRolePermissions
} from "../lib/rolePermissions.js";
import { withGuild } from "./discordClient.js";

const backupDirectory = path.join(process.cwd(), "backups");

function isDeploy(): boolean {
  return process.argv.includes("--deploy");
}

function isBackupOnly(): boolean {
  return process.argv.includes("--backup");
}

function listPermissions(label: string, permissions: string[]): void {
  console.log(`  ${label}: ${permissions.length > 0 ? permissions.join(", ") : "none"}`);
}

async function main(): Promise<void> {
  const deploy = isDeploy();
  const backupOnly = isBackupOnly();

  if (backupOnly) {
    const { backup, filePath } = await withGuild((guild) => createRolePermissionsBackup(guild));

    console.log("Role permissions backup complete.");
    console.log(`Server: ${backup.server.name} (${backup.server.id})`);
    console.log(`Roles: ${backup.roles.length}`);
    console.log(`File: ${filePath}`);
    return;
  }

  const report = await withGuild(async (guild) => {
    if (deploy) {
      const backup = await createRolePermissionsBackup(guild);
      console.log(`Pre-deploy role backup written: ${backup.filePath}`);
    }

    return runRolePermissions(guild, { dryRun: !deploy });
  });

  await mkdir(backupDirectory, { recursive: true });

  const reportPath = path.join(
    backupDirectory,
    deploy ? "role-permissions-deploy-latest.json" : "role-permissions-dry-run-latest.json"
  );

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`${deploy ? "Role permissions deployment" : "Role permissions dry-run"} complete.`);
  console.log(`Server: ${report.serverName} (${report.serverId})`);

  for (const change of report.changedRoles) {
    console.log(`Role: ${change.roleName}`);
    listPermissions("Added", change.added);
    listPermissions("Removed", change.removed);
  }

  if (report.missingRoles.length > 0) {
    console.error(`Missing roles: ${report.missingRoles.join(", ")}`);
  }

  for (const skippedRole of report.skippedRoles) {
    console.error(`Skipped ${skippedRole.roleName}: ${skippedRole.reason}`);
  }

  for (const error of report.errors) {
    console.error(`Error: ${error}`);
  }

  console.log(`Changed roles: ${report.changedRoles.length}`);
  console.log(`Unchanged roles: ${report.unchangedRoles.length}`);
  console.log(`Missing roles: ${report.missingRoles.length}`);
  console.log(`Skipped roles: ${report.skippedRoles.length}`);
  console.log(`Errors: ${report.errors.length}`);
  console.log(`Report: ${reportPath}`);

  if (hasRolePermissionSafetyProblems(report)) {
    console.error("Safety check failed. No role permission changes were applied.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Role permissions failed:", error);
  process.exit(1);
});
