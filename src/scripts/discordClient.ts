import "dotenv/config";
import { Client, GatewayIntentBits, Guild } from "discord.js";

function requiredEnv(name: "DISCORD_BOT_TOKEN" | "GUILD_ID"): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name} in .env.`);
  }

  return value;
}

export async function withGuild<T>(handler: (guild: Guild) => Promise<T>): Promise<T> {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  const token = requiredEnv("DISCORD_BOT_TOKEN");
  const guildId = requiredEnv("GUILD_ID");

  try {
    await client.login(token);
    const guild = await client.guilds.fetch(guildId);
    return await handler(guild);
  } finally {
    client.destroy();
  }
}
