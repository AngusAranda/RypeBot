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

export const deploymentPackageName = "Default Core Server";
export const serverName = "The RypeNation";

export const roleConfigs: RoleConfig[] = [
  { name: "Founder", color: 0xf97316, hoist: true, mentionable: false, reason: "Core leadership role for The RypeNation." },
  { name: "Admin", color: 0xef4444, hoist: true, mentionable: false, reason: "Administrator team role." },
  { name: "Moderator", color: 0x3b82f6, hoist: true, mentionable: false, reason: "Moderation team role." },
  { name: "Member", color: 0x94a3b8, hoist: false, mentionable: false, reason: "General member role." }
];

export const staffRoleNames = ["Founder", "Admin", "Moderator"];

export const categoryConfigs: CategoryConfig[] = [
  {
    name: "◤ ═══ WELCOME CENTER ═══ ◥",
    channels: [
      { name: "👋│Welcome", type: ChannelType.GuildText, topic: "Welcome to The RypeNation." },
      { name: "📜│Rules", type: ChannelType.GuildText, topic: "Community rules and expectations." },
      { name: "📢│Announcements", type: ChannelType.GuildText, topic: "Official announcements from The RypeNation." },
      { name: "🧭│Start Here", type: ChannelType.GuildText, topic: "Start here for the server basics." },
      { name: "🎭│Roles", type: ChannelType.GuildText, topic: "Choose or learn about server roles." },
      { name: "✅│Verification", type: ChannelType.GuildText, topic: "Verify access to the community." }
    ]
  },
  {
    name: "◤ ═══ SERVER INFORMATION ═══ ◥",
    channels: [
      { name: "📌│Server Guide", type: ChannelType.GuildText, topic: "Guide for using The RypeNation server." },
      { name: "🗺️│Directory", type: ChannelType.GuildText, topic: "Directory of important server areas." },
      { name: "❓│Faq", type: ChannelType.GuildText, topic: "Frequently asked questions." },
      { name: "🆘│Help Desk", type: ChannelType.GuildText, topic: "General help and server support." },
      { name: "📝│Change Log", type: ChannelType.GuildText, topic: "Server updates and change history." }
    ]
  },
  {
    name: "◤ ═══ COMMUNITY HUB ═══ ◥",
    channels: [
      { name: "💬│General Chat", type: ChannelType.GuildText, topic: "General community conversation." },
      { name: "👋│Introductions", type: ChannelType.GuildText, topic: "Introduce yourself to the community." },
      { name: "📸│Media Share", type: ChannelType.GuildText, topic: "Share photos, clips, screenshots, and media." },
      { name: "😂│Memes", type: ChannelType.GuildText, topic: "Share memes and fun posts." },
      { name: "🧠│Random Thoughts", type: ChannelType.GuildText, topic: "Casual thoughts, ideas, and side conversations." },
      { name: "🔊│General Voice", type: ChannelType.GuildVoice },
      { name: "☕│Chill Lounge", type: ChannelType.GuildVoice }
    ]
  },
  {
    name: "◤ ═══ SUPPORT DESK ═══ ◥",
    channels: [
      { name: "🎫│Open A Ticket", type: ChannelType.GuildText, topic: "Open or learn how to open a support ticket." },
      { name: "🛠️│Tech Support", type: ChannelType.GuildText, topic: "Get help with technical issues." },
      { name: "📩│Contact Staff", type: ChannelType.GuildText, topic: "Contact the staff team." },
      { name: "⚠️│Report A Problem", type: ChannelType.GuildText, topic: "Report problems that need attention." }
    ]
  },
  {
    name: "◤ ═══ STAFF OPERATIONS ═══ ◥",
    channels: [
      { name: "👑│Admin Chat", type: ChannelType.GuildText, topic: "Private admin discussion.", staffOnly: true },
      { name: "🛡️│Moderator Chat", type: ChannelType.GuildText, topic: "Private moderator discussion.", staffOnly: true },
      { name: "📋│Staff Notes", type: ChannelType.GuildText, topic: "Internal staff notes.", staffOnly: true },
      { name: "🚨│Reports", type: ChannelType.GuildText, topic: "Private report review.", staffOnly: true },
      { name: "🧾│Audit Log", type: ChannelType.GuildText, topic: "Private moderation and audit notes.", staffOnly: true },
      { name: "🔒│Staff Voice", type: ChannelType.GuildVoice, staffOnly: true }
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
