<div align="center">

# ⚙️ RypeBot

### The Official Discord Infrastructure Bot for The RypeNation

*"Building communities through automation."*

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

</div>

---

```text
██████╗ ██╗   ██╗██████╗ ███████╗██████╗  ██████╗ ████████╗
██╔══██╗╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗██╔═══██╗╚══██╔══╝
██████╔╝ ╚████╔╝ ██████╔╝█████╗  ██████╔╝██║   ██║   ██║
██╔══██╗  ╚██╔╝  ██╔═══╝ ██╔══╝  ██╔══██╗██║   ██║   ██║
██║  ██║   ██║   ██║     ███████╗██████╔╝╚██████╔╝   ██║
╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚══════╝╚═════╝  ╚═════╝    ╚═╝
```

---

# 🚀 About

**RypeBot** is the automation engine behind **The RypeNation Discord Community**.

It is built to create, deploy, maintain, and expand large-scale Discord communities using modular deployment packages instead of manually creating hundreds of channels and permissions.

Rather than acting like a traditional moderation bot, RypeBot serves as the operating system for Discord infrastructure.

---

# ✨ Features

## 🏗️ Server Infrastructure

- Automated server deployment
- Category creation
- Text channel creation
- Voice channel creation
- Permission management
- Server backups
- Safe redeployment
- Modular architecture

---

## 📦 Deployment Packages

Current deployment modules include:

- 🧭 Default Core Server
- 🔧 Server Commands
- 🌿 Cannabis
- 🍄 Psychedelics
- 🎮 Gaming
- 🕹️ Individual Game Communities
- 🎥 Movies & Television
- 📸 Photography
- 🎨 Content Creation
- 💻 Technology
- 🔊 Voice Communities
- ⚙️ Utility Modules

> **Note:**  
> The README intentionally does **not** list every channel.
>
> The deployment packages inside this repository are considered the source of truth and are updated much more frequently.

---

## Gaming Integrations

RypeBot includes a modular gaming service layer at `src/services/gaming` so individual games can share reusable API clients while keeping game-specific behavior separate.

Current integration:

- League of Legends

League slash commands:

- `/lol-item item` looks up League item details from Riot Data Dragon and returns source links.
- `/lol-player player tagline region` resolves a Riot ID through Account-V1, then builds a multi-embed player report from Summoner-V4, League-V4, Champion-Mastery-V4, Match-V5, and live game status when available.
- `/replay-latest` is owner-only and shows the latest completed match for the configured Riot account.
- `/render-replay match_id` is owner-only and creates a queued replay render job record. If `match_id` is omitted, RypeBot uses the latest completed match.
- `/render-status` is owner-only and shows the current in-memory replay render queue.
- `/render-cancel` is owner-only and cancels the active or pending replay render job when one exists.

League Replay Render MVP:

- The replay render foundation is intentionally queue-only for now.
- Riot Account-V1 resolves the configured Riot ID to a PUUID.
- Riot Match-V5 fetches the latest match IDs and match details.
- Rendering, OBS automation, FFmpeg orchestration, League Client control, League Director control, and YouTube upload are placeholder future integrations.
- The queue is currently in-memory and resets when the bot process restarts.

League item provider architecture:

- Data Dragon is the source of truth for item name, description, gold, stats, build paths, tags, maps, and icon.
- Community Dragon is optional enrichment for raw data and asset links.
- League Wiki and Fandom links are generated from the normalized item name for convenience.
- Wiki providers do not scrape page content, and `/lol-item` does not depend on unofficial sources.
- Providers are independent so future integrations can add sources such as Lolalytics, OP.GG, U.GG, or other game-specific providers.

League player examples:

- `/lol-player player: SomeName#NA1 region: na1`
- `/lol-player player: Some Name#1234 region: na1`
- `/lol-player player: SomeName tagline: NA1 region: na1`
- `/lol-player player: SomeName` uses `LOL_DEFAULT_REGION` and `LOL_DEFAULT_TAGLINE` when configured.

Riot IDs require both the game name and tagline because names are not globally unique. Name-only player input tries the configured default tagline when present, then asks for the exact Riot ID if Riot cannot find a match.

Supported League platform regions:

- Americas route: `na1`, `br1`, `la1`, `la2`
- Europe route: `euw1`, `eun1`, `tr1`, `ru`
- Asia route: `kr`, `jp1`
- SEA route: `oc1`, `ph2`, `sg2`, `th2`, `tw2`, `vn2`

League player lookup requires `RIOT_API_KEY` in the local `.env`. Optional defaults are `LOL_DEFAULT_REGION`, `LOL_DEFAULT_REGIONAL_ROUTING`, and `LOL_DEFAULT_TAGLINE`. Keep real Riot keys out of commits and only document variables in `.env.example`.

League replay render commands require:

- `OWNER_DISCORD_ID`: Discord user ID allowed to run replay/render commands. If missing, replay/render commands fail closed.
- `RIOT_API_KEY`: Riot developer API key.
- `RIOT_REGION`: Riot regional route for Account-V1 and Match-V5. Defaults to `americas`.
- `RIOT_PLATFORM`: League platform route. Defaults to `na1`.
- `RIOT_GAME_NAME`: configured Riot account game name. Defaults to `AngusAranda`.
- `RIOT_TAG_LINE`: configured Riot account tagline. Defaults to `9787`.

---

# 🛠️ Technology Stack

| Component | Technology |
|------------|------------|
| Language | TypeScript |
| Runtime | Node.js |
| Framework | Discord.js v14 |
| Package Manager | npm |
| Environment | dotenv |
| IDE | Visual Studio Code |
| Version Control | Git |
| Repository | GitHub |

---

# 📁 Project Structure

```text
RypeBot/
│
├── src/
│   ├── commands/
│   ├── deployments/
│   ├── events/
│   ├── utils/
│   ├── config/
│   ├── deploy-commands.ts
│   └── index.ts
│
├── dist/
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

---

# ⚡ Installation

Clone the repository.

```bash
git clone https://github.com/AngusAranda/RypeBot.git
```

Enter the project.

```bash
cd RypeBot
```

Install dependencies.

```bash
npm install
```

Create a `.env`

```env
DISCORD_BOT_TOKEN=YOUR_TOKEN
CLIENT_ID=YOUR_CLIENT_ID
GUILD_ID=YOUR_SERVER_ID
RIOT_API_KEY=YOUR_RIOT_API_KEY
OWNER_DISCORD_ID=YOUR_DISCORD_USER_ID
RIOT_REGION=americas
RIOT_PLATFORM=na1
RIOT_GAME_NAME=AngusAranda
RIOT_TAG_LINE=9787
```

Deploy slash commands.

```bash
npm run deploy-commands
```

Run the bot.

```bash
npm run dev
```

Production.

```bash
npm run build
npm start
```

---

# Infrastructure v1.0

RypeBot can answer the operational question: "Does Discord currently match GitHub/project config?"

Use these commands from PowerShell at the project root.

```powershell
npm run audit
npm run repair -- --dry-run
npm run repair
npm run rollback -- --dry-run
npm run rollback
npm run deploy:everything -- --dry-run
npm run deploy:everything
```

## Command Guide

`npm run audit`

Read-only. Compares the expected project configuration against the live Discord server. Reports matching items, missing roles/categories/channels, extra live objects, permission drift, warnings, and the recommended next command.

`npm run repair -- --dry-run`

Safe preview. Shows missing structure and permission changes that would be applied. Does not modify Discord.

`npm run repair`

Creates missing configured roles/categories/channels and applies role plus channel/category permission drift fixes. It writes a backup first and does not delete extra live Discord objects.

`npm run rollback -- --dry-run`

Safe preview. Finds the most recent `backups/permissions-backup-*.json` file and shows the role/channel permission state it would restore.

`npm run rollback`

Restores permissions from the most recent permission backup. It fails safely if no backup exists and does not guess missing live Discord objects.

`npm run deploy:everything -- --dry-run`

Runs the full pipeline in preview mode. It stops on the first failed safety check.

`npm run deploy:everything`

Runs the safe deployment pipeline in order: backup current live Discord state, deploy roles/categories/channels, deploy role permissions, deploy channel/category permissions, then prompts you to run `npm run audit`.

Extra live Discord objects are reported but not deleted. Deletion is intentionally not part of Infrastructure v1.0 unless a future command implements an explicit, reviewed `--delete-extra` workflow.

---
# 🔄 Typical Workflow

```text
          Make Changes
                │
                ▼
        Test In Discord
                │
                ▼
      Backup Deployment
                │
                ▼
      Deploy New Structure
                │
                ▼
         Commit To Git
                │
                ▼
         Push To GitHub
```

---

# 🧩 Git Commands

Check status

```bash
git status
```

Stage everything

```bash
git add .
```

Commit

```bash
git commit -m "Describe your changes"
```

Push

```bash
git push
```

Pull latest

```bash
git pull
```

---

# 🎯 Design Goals

RypeBot follows several guiding principles.

- Infrastructure as Code
- Automation First
- Modular Architecture
- Enterprise Organization
- Scalable Deployments
- Human Readable Configuration
- Easy Maintenance
- Safe Backups
- Clean Code

---

# 🗺️ Roadmap

## ✅ Phase 1

- Discord Bot Framework
- Slash Commands
- Server Deployment Packages
- Backup System
- Configuration System

---

## 🚧 Phase 2

- Moderation
- Welcome System
- Ticket System
- Verification
- Role Management
- Logging
- Auto Moderation

---

## 🚀 Phase 3

- Gaming Modules
- XP System
- Community Events
- Polls
- Music Utilities
- Leaderboards

---

## 🤖 Phase 4

Artificial Intelligence integration.

Planned features include:

- AI Moderation
- AI Support Assistant
- AI Server Builder
- AI Documentation
- AI Analytics
- AI Deployment Generator

---

# 🔒 Security

Never commit:

- `.env`
- Bot Token
- API Keys
- Secrets
- Production IDs

Always verify `.gitignore` before pushing.

---

# 🤝 Contributing

Contributions are welcome.

Please open an Issue first before submitting major Pull Requests.

---

# 📜 License

This project is licensed under the MIT License.

---

<div align="center">

## 🏭 The RypeNation

### Building communities through automation.

*"Create once. Deploy forever."*

⭐ If you like this project, consider starring the repository.

</div>
