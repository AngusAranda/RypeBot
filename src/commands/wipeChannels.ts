import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import { wipeGuildChannels } from "../lib/channelWiper.js";

const confirmationPhrase = "WIPE CHANNELS";

export const wipeChannelsCommand = {
  data: new SlashCommandBuilder()
    .setName("wipechannels")
    .setDescription("Delete every deletable channel in this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("confirm")
        .setDescription(`Type ${confirmationPhrase} to confirm channel deletion.`)
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", ephemeral: true });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "Only administrators can use /wipechannels.", ephemeral: true });
      return;
    }

    const confirmation = interaction.options.getString("confirm", true);

    if (confirmation !== confirmationPhrase) {
      await interaction.reply({
        content: `Channel wipe cancelled. To confirm, run /wipechannels with confirm set to ${confirmationPhrase}.`,
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await wipeGuildChannels(interaction.guild);
      await interaction.editReply(
        `Channel wipe complete. Deleted ${result.deleted.length} channel(s). Skipped ${result.skipped.length} channel(s).`
      );
    } catch (error) {
      console.error("Unexpected failure while wiping server channels:", error);
      await interaction.editReply("Channel wipe failed unexpectedly. Check the bot console for details.");
    }
  }
};
