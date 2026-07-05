import "dotenv/config";
import { REST, Routes } from "discord.js";
import { deployCommand } from "./commands/deploy.js";
import { deployEntertainmentCommand } from "./commands/deployEntertainment.js";
import { wipeChannelsCommand } from "./commands/wipeChannels.js";

type DiscordApplication = {
  id: string;
  name?: string;
};

function requiredEnv(name: "DISCORD_BOT_TOKEN" | "CLIENT_ID" | "GUILD_ID"): string {
  const value = process.env[name];

  if (!value) {
    console.error(`Missing ${name} in .env.`);
    process.exit(1);
  }

  return value;
}

const token = requiredEnv("DISCORD_BOT_TOKEN");
const clientId = requiredEnv("CLIENT_ID");
const guildId = requiredEnv("GUILD_ID");

const commands = [
  deployCommand.data.toJSON(),
  deployEntertainmentCommand.data.toJSON(),
  wipeChannelsCommand.data.toJSON()
];
const rest = new REST({ version: "10" }).setToken(token);

async function validateApplication(): Promise<void> {
  const application = await rest.get("/oauth2/applications/@me") as DiscordApplication;

  if (application.id !== clientId) {
    throw new Error(
      `CLIENT_ID does not match the bot token application. Expected ${application.id}${application.name ? ` (${application.name})` : ""}, received ${clientId}.`
    );
  }
}

async function main(): Promise<void> {
  try {
    console.log("Checking bot application settings...");
    await validateApplication();

    console.log("Registering guild slash commands...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log("Slash commands registered successfully.");
  } catch (error) {
    console.error("Failed to register slash commands:", error);
    console.error("Check that the bot has been invited to the GUILD_ID server and that GUILD_ID is the correct server ID.");
    process.exit(1);
  }
}

void main();
