import { Guild, GuildBasedChannel } from "discord.js";

export type WipeChannelsResult = {
  deleted: string[];
  skipped: Array<{
    name: string;
    id: string;
    reason: string;
  }>;
};

function describeChannel(channel: GuildBasedChannel): string {
  return `${channel.name} (${channel.id})`;
}

export async function wipeGuildChannels(guild: Guild): Promise<WipeChannelsResult> {
  const result: WipeChannelsResult = {
    deleted: [],
    skipped: []
  };

  const channels = [...guild.channels.cache.values()];

  console.log(`Starting channel wipe in guild: ${guild.name} (${guild.id})`);
  console.log(`Found ${channels.length} channel(s) to delete.`);

  for (const channel of channels) {
    try {
      console.log(`Deleting channel: ${describeChannel(channel)}`);
      await channel.delete("Administrator requested full server channel wipe.");
      result.deleted.push(describeChannel(channel));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      console.error(`Skipped channel Discord refused to delete: ${describeChannel(channel)} - ${reason}`);
      result.skipped.push({
        name: channel.name,
        id: channel.id,
        reason
      });
    }
  }

  console.log(`Channel wipe completed. Deleted: ${result.deleted.length}. Skipped: ${result.skipped.length}.`);
  return result;
}
