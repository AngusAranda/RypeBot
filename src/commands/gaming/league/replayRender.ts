import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder
} from "discord.js";
import { LeagueReplayMatchSummary, LeagueReplayService } from "../../../services/gaming/league/leagueReplayService.js";
import { LeagueServiceError } from "../../../services/gaming/league/leagueTypes.js";
import { RenderJob, RenderQueueService } from "../../../services/render/renderQueueService.js";

const leagueReplayService = new LeagueReplayService();
const renderQueueService = new RenderQueueService();

type RypeCommand = {
  data: Pick<SlashCommandBuilder, "name" | "toJSON">;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
};

function isOwner(interaction: ChatInputCommandInteraction): boolean {
  const ownerId = process.env.OWNER_DISCORD_ID;

  return Boolean(ownerId) && interaction.user.id === ownerId;
}

async function enforceOwner(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (isOwner(interaction)) {
    return true;
  }

  await interaction.reply({
    content: process.env.OWNER_DISCORD_ID
      ? "This RypeBot command is owner-only."
      : "This RypeBot command is locked because OWNER_DISCORD_ID is not configured.",
    ephemeral: true
  });
  return false;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatDate(date: Date): string {
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.TZ
  });
}

function leagueErrorMessage(error: LeagueServiceError): string {
  switch (error.code) {
    case "missing-api-key":
      return "RypeBot needs RIOT_API_KEY before League replay lookup can run.";
    case "invalid-region":
      return error.message;
    case "invalid-riot-id":
      return "The configured Riot ID is invalid. Check RIOT_GAME_NAME and RIOT_TAG_LINE.";
    case "account-not-found":
      return "RypeBot could not find the configured Riot account. Check RIOT_GAME_NAME, RIOT_TAG_LINE, and RIOT_REGION.";
    case "rate-limited":
      return "Riot is rate limiting requests right now. Try again shortly.";
    case "match-data-unavailable":
      return "Riot did not return completed match data for that request.";
    case "riot-unavailable":
      return "Riot API is unavailable or returned a failure right now.";
    case "item-not-found":
      return "That League item was not found.";
  }
}

function latestReplayEmbed(match: LeagueReplayMatchSummary): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("RypeBot League Replay")
    .setDescription("Latest completed match found and ready for the render queue foundation.")
    .setColor(match.win ? 0x0ac8b9 : 0xc89b3c)
    .addFields(
      { name: "Summoner / Riot ID", value: `${match.account.gameName}#${match.account.tagLine}`, inline: true },
      { name: "Match ID", value: match.matchId, inline: true },
      { name: "Champion", value: match.championName, inline: true },
      { name: "Queue", value: match.queueName, inline: true },
      { name: "Result", value: match.win ? "Win" : "Loss", inline: true },
      { name: "KDA", value: `${match.kills}/${match.deaths}/${match.assists}`, inline: true },
      { name: "CS", value: formatNumber(match.cs), inline: true },
      { name: "Gold", value: formatNumber(match.gold), inline: true },
      { name: "Champion Damage", value: formatNumber(match.damageDealtToChampions), inline: true },
      { name: "Duration", value: formatDuration(match.durationSeconds), inline: true },
      { name: "Started", value: formatDate(match.startTime), inline: true },
      { name: "Patch", value: match.gameVersion ?? "Unavailable", inline: true }
    )
    .setFooter({ text: "RypeBot Replay Render MVP" })
    .setTimestamp();
}

function renderJobEmbed(job: RenderJob): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("Replay Render Queued")
    .setDescription("The job record is ready. Rendering, OBS, FFmpeg, League Client, League Director, and YouTube upload are intentionally not active yet.")
    .setColor(0x0ac8b9)
    .addFields(
      { name: "Job ID", value: job.id, inline: false },
      { name: "Match ID", value: job.matchId, inline: false },
      { name: "Status", value: job.status, inline: true },
      { name: "Queued", value: formatDate(job.createdAt), inline: true }
    )
    .setFooter({ text: "RypeBot local Windows render agent foundation" })
    .setTimestamp();
}

function statusEmbed(jobs: RenderJob[]): EmbedBuilder {
  const latest = jobs[0];
  const lines = jobs.map((job) =>
    `**${job.status.toUpperCase()}** | ${job.matchId}\n${job.id}`
  );

  return new EmbedBuilder()
    .setTitle("Replay Render Queue")
    .setDescription(lines.length ? lines.join("\n\n") : "No render jobs are queued yet.")
    .setColor(0xc89b3c)
    .addFields({
      name: "Latest Status",
      value: latest ? `${latest.status} - ${latest.note ?? "No note."}` : "No jobs have been created.",
      inline: false
    })
    .setFooter({ text: "RypeBot Replay Render MVP" })
    .setTimestamp();
}

export const replayLatestCommand: RypeCommand = {
  data: new SlashCommandBuilder()
    .setName("replay-latest")
    .setDescription("Owner-only: show the latest completed League match for the configured Riot account.")
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!await enforceOwner(interaction)) {
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const match = await leagueReplayService.getLatestCompletedMatch();
      await interaction.editReply({ embeds: [latestReplayEmbed(match)] });
    } catch (error) {
      if (error instanceof LeagueServiceError) {
        await interaction.editReply(leagueErrorMessage(error));
        return;
      }

      console.error("Failed to fetch latest League replay match:", error);
      await interaction.editReply("RypeBot could not fetch the latest replay match right now.");
    }
  }
};

export const renderReplayCommand: RypeCommand = {
  data: new SlashCommandBuilder()
    .setName("render-replay")
    .setDescription("Owner-only: queue a League replay render job record.")
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("match_id")
        .setDescription("Optional Riot match ID. If omitted, RypeBot uses the latest completed match.")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!await enforceOwner(interaction)) {
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const explicitMatchId = interaction.options.getString("match_id");
      const matchId = explicitMatchId ?? (await leagueReplayService.getLatestCompletedMatch()).matchId;
      const job = renderQueueService.createJob(matchId, interaction.user.id);

      await interaction.editReply({ embeds: [renderJobEmbed(job)] });
    } catch (error) {
      if (error instanceof LeagueServiceError) {
        await interaction.editReply(leagueErrorMessage(error));
        return;
      }

      console.error("Failed to queue replay render job:", error);
      await interaction.editReply("RypeBot could not queue the replay render job right now.");
    }
  }
};

export const renderStatusCommand: RypeCommand = {
  data: new SlashCommandBuilder()
    .setName("render-status")
    .setDescription("Owner-only: show the current League replay render queue.")
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!await enforceOwner(interaction)) {
      return;
    }

    await interaction.reply({ embeds: [statusEmbed(renderQueueService.listJobs())], ephemeral: true });
  }
};

export const renderCancelCommand: RypeCommand = {
  data: new SlashCommandBuilder()
    .setName("render-cancel")
    .setDescription("Owner-only: cancel the active or pending replay render job.")
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!await enforceOwner(interaction)) {
      return;
    }

    const job = renderQueueService.cancelCurrentJob();

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle(job ? "Replay Render Cancelled" : "No Replay Render To Cancel")
        .setDescription(job ? `Cancelled job ${job.id} for match ${job.matchId}.` : "There is no active or pending render job right now.")
        .setColor(job ? 0xc89b3c : 0x785a28)
        .setFooter({ text: "RypeBot Replay Render MVP" })
        .setTimestamp()],
      ephemeral: true
    });
  }
};
