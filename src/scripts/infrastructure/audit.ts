import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ChannelType } from "discord.js";
import { runAdvancedPermissions } from "../../lib/advancedPermissions.js";
import { runRolePermissions } from "../../lib/rolePermissions.js";
import { withGuild } from "../discordClient.js";
import { loadDesiredState } from "./desiredState.js";
import {
  backupDirectory,
  findCategory,
  findChannelInCategory,
  findRole,
  namesMatch
} from "./shared.js";

type AuditReport = {
  generatedAt: string;
  server: string;
  loadedDesiredStatePackages: string[];
  matchingItems: string[];
  missingItems: string[];
  extraItems: string[];
  mismatchedPermissions: string[];
  warnings: string[];
  recommendedNextCommand: string;
};

function printSection(title: string, values: string[]): void {
  console.log(`\n${title}`);
  console.log(values.length > 0 ? values.map((value) => `  - ${value}`).join("\n") : "  - None");
}

async function main(): Promise<void> {
  const report = await withGuild(async (guild) => {
    await guild.roles.fetch();
    await guild.channels.fetch();

    const desiredState = await loadDesiredState();

    const matchingItems: string[] = [];
    const missingItems: string[] = [];
    const extraItems: string[] = [];
    const mismatchedPermissions: string[] = [];
    const warnings: string[] = [];

    for (const roleName of desiredState.roleNames) {
      if (findRole(guild, roleName)) {
        matchingItems.push(`Role: ${roleName}`);
      } else {
        missingItems.push(`Role: ${roleName}`);
      }
    }

    for (const categoryName of desiredState.categoryNames) {
      if (findCategory(guild, categoryName)) {
        matchingItems.push(`Category: ${categoryName}`);
      } else {
        missingItems.push(`Category: ${categoryName}`);
      }
    }

    for (const channel of desiredState.channels) {
      if (findChannelInCategory(guild, channel)) {
        matchingItems.push(`Channel: ${channel.categoryName} / ${channel.discordName}`);
      } else {
        missingItems.push(`Channel: ${channel.categoryName} / ${channel.discordName}`);
      }
    }

    const expectedRoleSet = new Set(desiredState.roleNames.map((role) => role.toLowerCase()));
    for (const role of guild.roles.cache.values()) {
      if (role.managed || role.id === guild.id) {
        continue;
      }

      if (!expectedRoleSet.has(role.name.toLowerCase())) {
        extraItems.push(`Role: ${role.name}`);
      }
    }

    for (const category of guild.channels.cache.filter((channel) => channel.type === ChannelType.GuildCategory).values()) {
      if (!desiredState.categoryNames.some((expected) => namesMatch(category.name, expected))) {
        extraItems.push(`Category: ${category.name}`);
      }
    }

    for (const channel of guild.channels.cache.filter((item) => item.type !== ChannelType.GuildCategory).values()) {
      const expectedByPackage = desiredState.channels.some((expected) =>
        channel.type === expected.type && namesMatch(channel.name, expected.discordName)
      );
      const expectedByPermissionTarget = desiredState.looseChannelNames.some((expected) => namesMatch(channel.name, expected));

      if (!expectedByPackage && !expectedByPermissionTarget) {
        extraItems.push(`Channel: ${channel.name}`);
      }
    }

    const rolePermissions = await runRolePermissions(guild, { dryRun: true });
    const advancedPermissions = await runAdvancedPermissions(guild, { dryRun: true });

    for (const change of rolePermissions.changedRoles) {
      mismatchedPermissions.push(`Role ${change.roleName}: add [${change.added.join(", ") || "none"}], remove [${change.removed.join(", ") || "none"}]`);
    }

    for (const missing of rolePermissions.missingRoles) {
      missingItems.push(`Role permission target: ${missing}`);
    }

    for (const skipped of rolePermissions.skippedRoles) {
      warnings.push(`Role permissions skipped ${skipped.roleName}: ${skipped.reason}`);
    }

    for (const missing of advancedPermissions.missingRoles) {
      missingItems.push(`Permission role target: ${missing}`);
    }

    for (const missing of advancedPermissions.missingCategories) {
      missingItems.push(`Permission category target: ${missing}`);
    }

    for (const missing of advancedPermissions.missingChannels) {
      missingItems.push(`Permission channel target: ${missing}`);
    }

    for (const planned of advancedPermissions.plannedChanges) {
      if (!planned.includes("Safety check failed")) {
        mismatchedPermissions.push(planned);
      }
    }

    warnings.push(...rolePermissions.errors, ...advancedPermissions.errors);

    const hasDrift = missingItems.length > 0 || mismatchedPermissions.length > 0;
    const recommendedNextCommand = hasDrift ? "npm run repair -- --dry-run" : "No repair needed. Discord currently matches GitHub/project config.";

    return {
      generatedAt: new Date().toISOString(),
      server: `${guild.name} (${guild.id})`,
      loadedDesiredStatePackages: desiredState.packageNames,
      matchingItems,
      missingItems: [...new Set(missingItems)].sort(),
      extraItems: [...new Set(extraItems)].sort(),
      mismatchedPermissions: [...new Set(mismatchedPermissions)].sort(),
      warnings: [...new Set(warnings)].sort(),
      recommendedNextCommand
    } satisfies AuditReport;
  });

  await mkdir(backupDirectory, { recursive: true });
  const reportPath = path.join(backupDirectory, "infrastructure-audit-latest.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("Infrastructure audit complete.");
  console.log(`Server: ${report.server}`);
  console.log(`Report: ${reportPath}`);
  printSection("Loaded desired-state packages", report.loadedDesiredStatePackages);
  printSection("Matching items", report.matchingItems);
  printSection("Missing items", report.missingItems);
  printSection("Extra items", report.extraItems);
  printSection("Mismatched permissions", report.mismatchedPermissions);
  printSection("Warnings", report.warnings);
  console.log(`\nRecommended next command: ${report.recommendedNextCommand}`);

  if (report.missingItems.length > 0 || report.mismatchedPermissions.length > 0 || report.warnings.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Infrastructure audit failed:", error);
  process.exit(1);
});
