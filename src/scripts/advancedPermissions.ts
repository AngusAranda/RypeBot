import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { runAdvancedPermissions } from "../lib/advancedPermissions.js";
import { createPermissionBackup } from "../lib/permissionBackup.js";
import { withGuild } from "./discordClient.js";

const backupDirectory = path.join(process.cwd(), "backups");

function isDeploy(): boolean {
  return process.argv.includes("--deploy");
}

function hasSafetyProblems(report: {
  missingRoles: string[];
  missingCategories: string[];
  missingChannels: string[];
  errors: string[];
}): boolean {
  return report.missingRoles.length > 0 ||
    report.missingCategories.length > 0 ||
    report.missingChannels.length > 0 ||
    report.errors.length > 0;
}

async function main(): Promise<void> {
  const deploy = isDeploy();

  const report = await withGuild(async (guild) => {
    if (deploy) {
      const backup = await createPermissionBackup(guild);
      console.log(`Pre-deploy backup written: ${backup.filePath}`);
    }

    return runAdvancedPermissions(guild, { dryRun: !deploy });
  });

  await mkdir(backupDirectory, { recursive: true });

  const reportPath = path.join(
    backupDirectory,
    deploy ? "advanced-permissions-deploy-latest.json" : "advanced-permissions-dry-run-latest.json"
  );

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`${deploy ? "Advanced permissions deployment" : "Advanced permissions dry-run"} complete.`);
  console.log(`Server: ${report.serverName} (${report.serverId})`);
  console.log(`Categories: ${new Set(report.categoriesChanged).size}`);
  console.log(`Synced child channels: ${new Set(report.channelsSynced).size}`);
  console.log(`Channel exceptions: ${new Set(report.channelExceptionsChanged).size}`);
  console.log(`Planned changes: ${report.plannedChanges.length}`);
  console.log(`Report: ${reportPath}`);

  if (hasSafetyProblems(report)) {
    console.error("Safety check failed. No permission changes were applied.");
    console.error(`Missing roles: ${report.missingRoles.length}`);
    console.error(`Missing categories: ${report.missingCategories.length}`);
    console.error(`Missing channels: ${report.missingChannels.length}`);
    console.error(`Errors: ${report.errors.length}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Advanced permissions failed:", error);
  process.exit(1);
});
