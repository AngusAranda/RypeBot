# The RypeNation Discord Bot

A TypeScript Discord bot built with discord.js v14. It registers administrator-only slash commands for deploying The RypeNation server packages and wiping server channels when explicitly confirmed.

## Requirements

- Node.js 20 or newer recommended
- A Discord bot application
- The existing `.env` file in this folder with:

```env
DISCORD_BOT_TOKEN=your_bot_token
GUILD_ID=1516329583685664899
CLIENT_ID=1523216011136864276
```

Do not commit or share your `.env` file.

## Bot Permissions

When inviting the bot, make sure it has these permissions:

- Manage Roles
- Manage Channels
- View Channels
- Send Messages
- Read Message History

The bot role must be higher than any role it needs to create or manage.

## Commands

### Discord slash commands

- `/deploy` creates the Default Core Server package only.
- `/deployentertainment` adds the Entertainment Expansion package only.
- `/wipechannels confirm:WIPE CHANNELS` deletes every deletable channel in the server and does not create anything afterward.

`/wipechannels` is destructive. It removes category, text, voice, forum, stage, announcement, and other deletable channel types. It requires Administrator permission and the exact confirmation phrase `WIPE CHANNELS`.

### Register slash commands

```bash
npm.cmd run deploy-commands
```

### Run in development

```bash
npm.cmd run dev
```

### Build

```bash
npm.cmd run build
```

### Start compiled bot

```bash
npm.cmd start
```

## Deployment Flow

1. Install dependencies.
2. Register slash commands.
3. Start the bot.
4. In Discord, run `/deploy` as a server administrator.

The current `/deploy` command creates the Default Core Server package:

- Welcome Center
- Server Information
- Community Hub
- Support Desk
- Staff Operations

The `/deploy` command is safe to run more than once. Existing roles, categories, and matching channels are reused instead of duplicated.

The `/deployentertainment` command adds these entertainment categories only:

- Cannabis & Psychedelics
- Gaming Hub
- Competitive Games
- Featured Games

The `/deployentertainment` command is additive and safe to run more than once. It does not delete, modify, or rebuild the Default Core package.

The `/wipechannels` command is separate from `/deploy`. It only wipes channels and does not rebuild the server afterward.

## Deployment Packages

The active deployment package is kept in `src/config/serverConfig.ts` and `src/lib/serverBuilder.ts` so `/deploy` stays simple to run.

Previous deployment packages are backed up in `src/deployments/`. The earlier themed RypeNation layout was saved there before this default core package replaced the active deployment.

The entertainment package is kept separate in `src/config/entertainmentConfig.ts`, `src/lib/entertainmentBuilder.ts`, and `src/commands/deployEntertainment.ts`.

The channel wipe package is kept separate in `src/lib/channelWiper.ts` and `src/commands/wipeChannels.ts`.
