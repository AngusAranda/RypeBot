import { readFile } from "node:fs/promises";
import path from "node:path";
import { ChannelType } from "discord.js";
import { categoryConfigs, roleConfigs } from "../../config/serverConfig.js";
import { entertainmentCategoryConfigs } from "../../config/entertainmentConfig.js";
import { toDiscordChannelName } from "./shared.js";

export type DesiredChannel = {
  name: string;
  discordName: string;
  type: ChannelType.GuildText | ChannelType.GuildVoice;
  categoryName: string;
  packageName: string;
};

export type DesiredState = {
  packageNames: string[];
  roleNames: string[];
  categoryNames: string[];
  channels: DesiredChannel[];
  looseChannelNames: string[];
};

type RoleJsonConfig = {
  permissionRoles: Array<{ name: string }>;
  interestRoles: Array<{ name: string }>;
  notificationRoles: string[];
};

type AdvancedPermissionsConfig = {
  categories: Array<{ name: string }>;
  channelExceptions: Array<{ name: string }>;
};

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export async function loadDesiredState(): Promise<DesiredState> {
  const rolesPath = path.join(process.cwd(), "config", "roles.json");
  const advancedPermissionsPath = path.join(process.cwd(), "config", "advanced-permissions.json");
  const rolesConfig = JSON.parse(await readFile(rolesPath, "utf8")) as RoleJsonConfig;
  const advancedPermissionsConfig = JSON.parse(await readFile(advancedPermissionsPath, "utf8")) as AdvancedPermissionsConfig;
  const packageNames = [
    "core",
    "roles",
    "gaming",
    "cannabis-psychedelics",
    "advanced-permissions",
    "role-permissions"
  ];

  const roleNames = uniqueSorted([
    ...roleConfigs.map((role) => role.name),
    ...rolesConfig.permissionRoles.map((role) => role.name),
    ...rolesConfig.interestRoles.map((role) => role.name),
    ...rolesConfig.notificationRoles,
    "JOB Bot"
  ]);

  const allCategories = [
    ...categoryConfigs.map((category) => ({ ...category, packageName: "core" })),
    ...entertainmentCategoryConfigs.map((category) => ({
      ...category,
      packageName: category.name.toLowerCase().includes("cannabis") ? "cannabis-psychedelics" : "gaming"
    }))
  ];

  const categoryNames = uniqueSorted([
    ...allCategories.map((category) => category.name),
    ...advancedPermissionsConfig.categories.map((category) => category.name)
  ]);
  const channels = allCategories.flatMap((category) =>
    category.channels.map((channel) => ({
      name: channel.name,
      discordName: toDiscordChannelName(channel.name, channel.type),
      type: channel.type,
      categoryName: category.name,
      packageName: category.packageName
    }))
  );
  const looseChannelNames = uniqueSorted(advancedPermissionsConfig.channelExceptions.map((channel) => channel.name));

  return {
    packageNames,
    roleNames,
    categoryNames,
    channels,
    looseChannelNames
  };
}
