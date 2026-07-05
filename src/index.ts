import "dotenv/config";
import { Client, Events, GatewayIntentBits, Interaction } from "discord.js";
import { auditServerCommand } from "./commands/auditServer.js";
import { deployCommand } from "./commands/deploy.js";
import { deployEntertainmentCommand } from "./commands/deployEntertainment.js";
import { deployPermissionsCommand } from "./commands/deployPermissions.js";
import { wipeChannelsCommand } from "./commands/wipeChannels.js";

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN in .env.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}.`);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const commands = new Map([
    [auditServerCommand.data.name, auditServerCommand.execute],
    [deployCommand.data.name, deployCommand.execute],
    [deployEntertainmentCommand.data.name, deployEntertainmentCommand.execute],
    [deployPermissionsCommand.data.name, deployPermissionsCommand.execute],
    [wipeChannelsCommand.data.name, wipeChannelsCommand.execute]
  ]);
  const execute = commands.get(interaction.commandName);

  if (!execute) {
    return;
  }

  try {
    await execute(interaction);
  } catch (error) {
    console.error(`Unhandled error while running /${interaction.commandName}:`, error);

    const message = "Something went wrong while running this command.";

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message).catch((replyError) => {
        console.error("Failed to edit error reply:", replyError);
      });
      return;
    }

    await interaction.reply({ content: message, ephemeral: true }).catch((replyError) => {
      console.error("Failed to send error reply:", replyError);
    });
  }
});

client.login(token).catch((error) => {
  console.error("Failed to log in to Discord:", error);
  process.exit(1);
});
