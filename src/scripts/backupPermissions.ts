import { createPermissionBackup } from "../lib/permissionBackup.js";
import { withGuild } from "./discordClient.js";

async function main(): Promise<void> {
  const { backup, filePath } = await withGuild((guild) => createPermissionBackup(guild));

  console.log("Permission backup complete.");
  console.log(`Server: ${backup.server.name} (${backup.server.id})`);
  console.log(`Roles: ${backup.roles.length}`);
  console.log(`Categories: ${backup.categories.length}`);
  console.log(`Channels: ${backup.channels.length}`);
  console.log(`File: ${filePath}`);
}

main().catch((error) => {
  console.error("Permission backup failed:", error);
  process.exit(1);
});
