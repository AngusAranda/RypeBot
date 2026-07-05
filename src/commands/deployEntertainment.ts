import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import { entertainmentDeploymentPackageName } from "../config/entertainmentConfig.js";
import { buildEntertainmentExpansion } from "../lib/entertainmentBuilder.js";

export const deployEntertainmentCommand = {
  data: new SlashCommandBuilder()
    .setName("deployentertainment")
    .setDescription("Add The RypeNation entertainment category expansion.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", ephemeral: true });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "Only administrators can use /deployentertainment.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await buildEntertainmentExpansion(interaction.guild);
      await interaction.editReply(`The RypeNation ${entertainmentDeploymentPackageName} deployment completed successfully.`);
    } catch (error) {
      console.error(`Failed to deploy The RypeNation ${entertainmentDeploymentPackageName}:`, error);
      await interaction.editReply("Entertainment deployment failed. Check the bot console for details and verify the bot has Manage Channels permissions.");
    }
  }
};
