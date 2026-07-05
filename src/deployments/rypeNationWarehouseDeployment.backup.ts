import { ChannelType, PermissionFlagsBits } from "discord.js";

export type RoleConfig = {
  name: string;
  color: number;
  hoist?: boolean;
  mentionable?: boolean;
  reason: string;
};

export type ChannelConfig = {
  name: string;
  type: ChannelType.GuildText | ChannelType.GuildVoice;
  topic?: string;
  staffOnly?: boolean;
};

export type CategoryConfig = {
  name: string;
  channels: ChannelConfig[];
};

export const serverName = "The RypeNation";

export const roleConfigs: RoleConfig[] = [
  { name: "Founder", color: 0xf97316, hoist: true, mentionable: false, reason: "Core leadership role for The RypeNation." },
  { name: "Admin", color: 0xef4444, hoist: true, mentionable: false, reason: "Administrator team role." },
  { name: "Moderator", color: 0x3b82f6, hoist: true, mentionable: false, reason: "Moderation team role." },
  { name: "RypeTech", color: 0x14b8a6, hoist: false, mentionable: true, reason: "Technology community role." },
  { name: "Gamer", color: 0x8b5cf6, hoist: false, mentionable: true, reason: "Gaming community role." },
  { name: "Streamer", color: 0xec4899, hoist: false, mentionable: true, reason: "Streaming community role." },
  { name: "Smoke Sesh", color: 0x22c55e, hoist: false, mentionable: true, reason: "Cannabis and safety meeting community role." },
  { name: "Member", color: 0x94a3b8, hoist: false, mentionable: false, reason: "General member role." }
];

export const staffRoleNames = ["Founder", "Admin", "Moderator"];

export const categoryConfigs: CategoryConfig[] = [
  {
    name: "Information",
    channels: [
      { name: "welcome", type: ChannelType.GuildText, topic: "Welcome to The RypeNation." },
      { name: "rules", type: ChannelType.GuildText, topic: "Community rules, expectations, and safety notes." },
      { name: "announcements", type: ChannelType.GuildText, topic: "Official updates from The RypeNation team." },
      { name: "roles", type: ChannelType.GuildText, topic: "Role information for RypeTech, gaming, streaming, and chill sessions." }
    ]
  },
  {
    name: "Community",
    channels: [
      { name: "general", type: ChannelType.GuildText, topic: "General community chat." },
      { name: "introductions", type: ChannelType.GuildText, topic: "Meet the community." },
      { name: "memes-media", type: ChannelType.GuildText, topic: "Share memes, clips, screenshots, and media." },
      { name: "wins-and-shoutouts", type: ChannelType.GuildText, topic: "Celebrate community wins and shoutouts." }
    ]
  },
  {
    name: "RypeTech",
    channels: [
      { name: "tech-talk", type: ChannelType.GuildText, topic: "Tech builds, tools, software, and hardware." },
      { name: "ai-automation", type: ChannelType.GuildText, topic: "AI workflows, automation, bots, and experiments." },
      { name: "support-desk", type: ChannelType.GuildText, topic: "Community tech help and troubleshooting." },
      { name: "project-lab", type: ChannelType.GuildText, topic: "Share projects, ideas, and builds." }
    ]
  },
  {
    name: "Gaming",
    channels: [
      { name: "gaming-chat", type: ChannelType.GuildText, topic: "Gaming discussion and party planning." },
      { name: "looking-for-group", type: ChannelType.GuildText, topic: "Find players and squads." },
      { name: "clips-highlights", type: ChannelType.GuildText, topic: "Share gameplay clips and highlights." },
      { name: "game-news", type: ChannelType.GuildText, topic: "Gaming news and updates." }
    ]
  },
  {
    name: "Live Streams",
    channels: [
      { name: "stream-announcements", type: ChannelType.GuildText, topic: "Going-live posts and stream schedules." },
      { name: "stream-chat", type: ChannelType.GuildText, topic: "Chat for live streams and watch parties." },
      { name: "creator-corner", type: ChannelType.GuildText, topic: "Streamer tips, assets, and collaboration." }
    ]
  },
  {
    name: "Chill Sessions",
    channels: [
      { name: "smoke-sesh", type: ChannelType.GuildText, topic: "Cannabis conversation for adults where legal. Keep it respectful and safe." },
      { name: "safety-meeting", type: ChannelType.GuildText, topic: "Responsible-use reminders, harm reduction, and community check-ins." },
      { name: "music-and-vibes", type: ChannelType.GuildText, topic: "Music, playlists, and relaxed conversation." }
    ]
  },
  {
    name: "Events",
    channels: [
      { name: "event-board", type: ChannelType.GuildText, topic: "Upcoming community events." },
      { name: "event-planning", type: ChannelType.GuildText, topic: "Plan tournaments, streams, hangouts, and sessions." },
      { name: "giveaways", type: ChannelType.GuildText, topic: "Giveaways and community rewards." }
    ]
  },
  {
    name: "Voice Comms",
    channels: [
      { name: "Lobby", type: ChannelType.GuildVoice },
      { name: "Gaming 1", type: ChannelType.GuildVoice },
      { name: "Gaming 2", type: ChannelType.GuildVoice },
      { name: "Stream Room", type: ChannelType.GuildVoice },
      { name: "Smoke Sesh Lounge", type: ChannelType.GuildVoice },
      { name: "AFK", type: ChannelType.GuildVoice }
    ]
  },
  {
    name: "Staff HQ",
    channels: [
      { name: "staff-chat", type: ChannelType.GuildText, topic: "Private staff discussion.", staffOnly: true },
      { name: "mod-log", type: ChannelType.GuildText, topic: "Moderation notes and logging.", staffOnly: true },
      { name: "reports", type: ChannelType.GuildText, topic: "Private report review area.", staffOnly: true },
      { name: "staff-announcements", type: ChannelType.GuildText, topic: "Private staff updates.", staffOnly: true },
      { name: "Staff Voice", type: ChannelType.GuildVoice, staffOnly: true }
    ]
  }
];

export const everyoneDenyStaffPermissions = [PermissionFlagsBits.ViewChannel];
export const staffAllowPermissions = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak
];
