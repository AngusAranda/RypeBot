import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import { deploymentPackageName } from "../config/serverConfig.js";
import { buildRypeNationServer } from "../lib/serverBuilder.js";

export const deployCommand = {
  data: new SlashCommandBuilder()
    .setName("deploy")
    .setDescription("Build The RypeNation default core server structure.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", ephemeral: true });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "Only administrators can use /deploy.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await buildRypeNationServer(interaction.guild);
      await interaction.editReply(`The RypeNation ${deploymentPackageName} deployment completed successfully.`);
    } catch (error) {
      console.error(`Failed to deploy The RypeNation ${deploymentPackageName}:`, error);
      await interaction.editReply("Deployment failed. Check the bot console for details and verify the bot has Manage Roles and Manage Channels permissions.");
    }
  }
};

