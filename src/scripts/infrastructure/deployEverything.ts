import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createPermissionBackup } from "../../lib/permissionBackup.js";
import { createRolePermissionsBackup, runRolePermissions } from "../../lib/rolePermissions.js";
import { runAdvancedPermissions } from "../../lib/advancedPermissions.js";
import { buildRypeNationServer } from "../../lib/serverBuilder.js";
import { buildEntertainmentExpansion } from "../../lib/entertainmentBuilder.js";
import { withGuild } from "../discordClient.js";
import { loadDesiredState } from "./desiredState.js";
import { backupDirectory, parseOptions } from "./shared.js";

type StepResult = {
  step: string;
  status: "ok" | "failed";
  details: string[];
};

async function runStep(results: StepResult[], step: string, action: () => Promise<string[]>): Promise<void> {
  console.log(`\n[deploy:everything] ${step}`);

  try {
    const details = await action();
    results.push({ step, status: "ok", details });
    for (const detail of details) {
      console.log(`  - ${detail}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ step, status: "failed", details: [message] });
    throw new Error(`Failed step: ${step}. ${message}`);
  }
}

async function main(): Promise<void> {
  const options = parseOptions();
  const results: StepResult[] = [];
  const desiredState = await loadDesiredState();

  console.log("Loaded desired-state packages:");
  for (const packageName of desiredState.packageNames) {
    console.log(`  - ${packageName}`);
  }

  await withGuild(async (guild) => {
    await runStep(results, "backup current live Discord state", async () => {
      if (options.dryRun) {
        return ["Dry-run: skipped writing new backup files."];
      }

      const permissionBackup = await createPermissionBackup(guild);
      const roleBackup = await createRolePermissionsBackup(guild);
      return [permissionBackup.filePath, roleBackup.filePath];
    });

    await runStep(results, "deploy roles, categories, and channels", async () => {
      if (options.dryRun) {
        return ["Dry-run: run npm run repair -- --dry-run for the detailed structure preview."];
      }

      await buildRypeNationServer(guild);
      await buildEntertainmentExpansion(guild);
      return ["Core and entertainment server structure deployed."];
    });

    await runStep(results, "deploy role permissions", async () => {
      const report = await runRolePermissions(guild, { dryRun: options.dryRun });
      const errors = report.errors.length + report.missingRoles.length + report.skippedRoles.length;

      if (errors > 0) {
        throw new Error(`Role permission deployment reported ${errors} safety issue(s).`);
      }

      return [
        `Changed roles: ${report.changedRoles.length}`,
        `Unchanged roles: ${report.unchangedRoles.length}`
      ];
    });

    await runStep(results, "deploy channel and category permissions", async () => {
      const report = await runAdvancedPermissions(guild, { dryRun: options.dryRun });
      const errors = report.errors.length + report.missingRoles.length + report.missingCategories.length + report.missingChannels.length;

      if (errors > 0) {
        throw new Error(`Advanced permission deployment reported ${errors} safety issue(s).`);
      }

      return [
        `Category policies: ${new Set(report.categoriesChanged).size}`,
        `Synced channels: ${new Set(report.channelsSynced).size}`,
        `Channel exceptions: ${new Set(report.channelExceptionsChanged).size}`
      ];
    });

    await runStep(results, "run audit", async () => {
      const roleReport = await runRolePermissions(guild, { dryRun: true });
      const advancedReport = await runAdvancedPermissions(guild, { dryRun: true });
      const driftCount = roleReport.changedRoles.length +
        roleReport.missingRoles.length +
        roleReport.skippedRoles.length +
        roleReport.errors.length +
        advancedReport.missingRoles.length +
        advancedReport.missingCategories.length +
        advancedReport.missingChannels.length +
        advancedReport.errors.length;

      if (driftCount > 0) {
        throw new Error(`Post-deploy audit found ${driftCount} drift or safety issue(s).`);
      }

      return ["Post-deploy permission audit passed."];
    });
  });

  await mkdir(backupDirectory, { recursive: true });
  const reportPath = path.join(backupDirectory, options.dryRun ? "deploy-everything-dry-run-latest.json" : "deploy-everything-latest.json");
  await writeFile(reportPath, `${JSON.stringify({ dryRun: options.dryRun, results }, null, 2)}\n`, "utf8");

  console.log("\nDeploy everything pipeline complete.");
  console.log(`Report: ${reportPath}`);
  console.log("Next command: npm run audit");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
