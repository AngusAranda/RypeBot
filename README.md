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
DISCORD_TOKEN=YOUR_TOKEN
CLIENT_ID=YOUR_CLIENT_ID
GUILD_ID=YOUR_SERVER_ID
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
