import { ChannelType } from "discord.js";
import type { CategoryConfig } from "./serverConfig.js";

export const entertainmentDeploymentPackageName = "Entertainment Expansion";

export const entertainmentCategoryConfigs: CategoryConfig[] = [
  {
    name: "◤ ═══ CANNABIS & PSYCHEDELICS ═══ ◥",
    channels: [
      { name: "🌿│General Cannabis", type: ChannelType.GuildText, topic: "Cannabis community discussion." },
      { name: "🔥│Smoke Sessions", type: ChannelType.GuildText, topic: "Smoke session chat and hangouts." },
      { name: "🌱│Growing", type: ChannelType.GuildText, topic: "Growing discussion and shared knowledge." },
      { name: "🛒│Gear & Accessories", type: ChannelType.GuildText, topic: "Gear, accessories, tools, and setups." },
      { name: "🍃│Strains", type: ChannelType.GuildText, topic: "Strain discussion and notes." },
      { name: "🍄│Mushrooms", type: ChannelType.GuildText, topic: "Mushroom discussion and education." },
      { name: "💎│DMT", type: ChannelType.GuildText, topic: "DMT discussion and education." },
      { name: "🧬│LSD", type: ChannelType.GuildText, topic: "LSD discussion and education." },
      { name: "🌵│Mescaline", type: ChannelType.GuildText, topic: "Mescaline discussion and education." },
      { name: "💊│MDMA", type: ChannelType.GuildText, topic: "MDMA discussion and education." },
      { name: "🌳│Ibogaine", type: ChannelType.GuildText, topic: "Ibogaine discussion and education." },
      { name: "🧠│Psychedelic Discussion", type: ChannelType.GuildText, topic: "General psychedelic discussion." },
      { name: "📚│Research & Studies", type: ChannelType.GuildText, topic: "Research, studies, and educational resources." },
      { name: "🎨│Trip Art", type: ChannelType.GuildText, topic: "Trip art and creative expression." },
      { name: "📸│Smoke & Setup Pictures", type: ChannelType.GuildText, topic: "Smoke and setup pictures." },
      { name: "🌿│Smoke Lounge", type: ChannelType.GuildVoice },
      { name: "🧠│Deep Conversations", type: ChannelType.GuildVoice }
    ]
  },
  {
    name: "◤ ═══ GAMING HUB ═══ ◥",
    channels: [
      { name: "🎮│General Gaming", type: ChannelType.GuildText, topic: "General gaming discussion." },
      { name: "📰│Gaming News", type: ChannelType.GuildText, topic: "Gaming news and updates." },
      { name: "💻│PC Gaming", type: ChannelType.GuildText, topic: "PC gaming discussion." },
      { name: "🎮│Console Gaming", type: ChannelType.GuildText, topic: "Console gaming discussion." },
      { name: "📱│Mobile Gaming", type: ChannelType.GuildText, topic: "Mobile gaming discussion." },
      { name: "🏆│Achievements", type: ChannelType.GuildText, topic: "Achievements, milestones, and wins." },
      { name: "🎥│Game Clips", type: ChannelType.GuildText, topic: "Game clips and highlights." },
      { name: "😂│Gaming Memes", type: ChannelType.GuildText, topic: "Gaming memes and jokes." },
      { name: "🔍│Looking For Group", type: ChannelType.GuildText, topic: "Find teammates and groups." },
      { name: "🎲│Indie Games", type: ChannelType.GuildText, topic: "Indie game discussion." },
      { name: "🎧│Gaming VC 1", type: ChannelType.GuildVoice },
      { name: "🎧│Gaming VC 2", type: ChannelType.GuildVoice },
      { name: "🎧│Squad Room 1", type: ChannelType.GuildVoice },
      { name: "🎧│Squad Room 2", type: ChannelType.GuildVoice }
    ]
  },
  {
    name: "◤ ═══ COMPETITIVE GAMES ═══ ◥",
    channels: [
      { name: "🔫│Shooters", type: ChannelType.GuildText, topic: "Shooter game discussion." },
      { name: "⚔️│MOBA", type: ChannelType.GuildText, topic: "MOBA game discussion." },
      { name: "🛡️│MMORPG", type: ChannelType.GuildText, topic: "MMORPG discussion." },
      { name: "🚗│Racing", type: ChannelType.GuildText, topic: "Racing game discussion." },
      { name: "⚽│Sports Games", type: ChannelType.GuildText, topic: "Sports game discussion." },
      { name: "🧩│Puzzle Games", type: ChannelType.GuildText, topic: "Puzzle game discussion." },
      { name: "🏰│Strategy Games", type: ChannelType.GuildText, topic: "Strategy game discussion." },
      { name: "🃏│Card Games", type: ChannelType.GuildText, topic: "Card game discussion." },
      { name: "👻│Horror Games", type: ChannelType.GuildText, topic: "Horror game discussion." },
      { name: "🕹️│Retro Games", type: ChannelType.GuildText, topic: "Retro game discussion." },
      { name: "🥽│VR Gaming", type: ChannelType.GuildText, topic: "VR gaming discussion." }
    ]
  },
  {
    name: "◤ ═══ FEATURED GAMES ═══ ◥",
    channels: [
      { name: "🛡️│League Of Legends", type: ChannelType.GuildText, topic: "League Of Legends community." },
      { name: "🏰│Minecraft", type: ChannelType.GuildText, topic: "Minecraft community." },
      { name: "🚌│Fortnite", type: ChannelType.GuildText, topic: "Fortnite community." },
      { name: "🎯│Call Of Duty", type: ChannelType.GuildText, topic: "Call Of Duty community." },
      { name: "💥│Warzone", type: ChannelType.GuildText, topic: "Warzone community." },
      { name: "🪂│PUBG", type: ChannelType.GuildText, topic: "PUBG community." },
      { name: "🚘│Rocket League", type: ChannelType.GuildText, topic: "Rocket League community." },
      { name: "🌈│Valorant", type: ChannelType.GuildText, topic: "Valorant community." },
      { name: "🚓│GTA Online", type: ChannelType.GuildText, topic: "GTA Online community." },
      { name: "🔨│Rust", type: ChannelType.GuildText, topic: "Rust community." },
      { name: "🦖│ARK", type: ChannelType.GuildText, topic: "ARK community." },
      { name: "🚀│Helldivers 2", type: ChannelType.GuildText, topic: "Helldivers 2 community." },
      { name: "🏴│Sea Of Thieves", type: ChannelType.GuildText, topic: "Sea Of Thieves community." },
      { name: "🧟│DayZ", type: ChannelType.GuildText, topic: "DayZ community." },
      { name: "🚂│Factorio", type: ChannelType.GuildText, topic: "Factorio community." },
      { name: "🌌│No Man's Sky", type: ChannelType.GuildText, topic: "No Man's Sky community." },
      { name: "🎧│League Squad", type: ChannelType.GuildVoice },
      { name: "🎧│FPS Squad", type: ChannelType.GuildVoice },
      { name: "🎧│Sandbox Squad", type: ChannelType.GuildVoice }
    ]
  }
];
