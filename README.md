# VoiceFit 2.0

A voice-first fitness tracking application with AI coaching, personalized programs, and GPS running.

## Quick Links

| Document | Description |
|----------|-------------|
| [Project Completion Roadmap](docs/audits/PROJECT_COMPLETION_ROADMAP.md) | Full audit, issue inventory, and action plan |
| [Master Plan](docs/implementation/MASTER_PLAN.md) | Technology decisions, feature tiers, status |
| [Task List](docs/implementation/TASK_LIST.md) | 156 tasks across 11 phases |
| [UI Specification](docs/UI_SPECIFICATION.md) | Design system, colors, typography |
| [API Reference](docs/implementation/API_REFERENCE.md) | tRPC router documentation |
| [AI Tool Catalog](docs/TOOL_CATALOG.md) | 60 AI tools with full specs |

## Project Structure

```
apps/
├── backend/          # tRPC + Drizzle + PostgreSQL (85% complete)
├── mobile/           # React Native + Expo SDK 53 (60-70% complete)
└── web/              # Next.js 15 Coach Dashboard (85-90% complete)

packages/
└── shared/           # Shared types and utilities

docs/
├── implementation/   # Active planning documents
├── audits/           # Project audits and roadmaps
├── reference/        # Source specifications
└── archive/          # Historical documents
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native 0.79.6, Expo Router, Zustand, NativeWind |
| Backend | tRPC 11, Drizzle ORM, PostgreSQL |
| Web | Next.js 15, Tailwind CSS, Supabase SSR |
| Database | Supabase (69 tables, 200+ indexes) |
| Offline | PowerSync |
| AI | xAI Grok (4 models) via Vercel AI SDK |
| AI Tools | 60 tools (35 athlete + 25 coach) |
| Search | Upstash Vector |
| Cache | Upstash Redis |

## Getting Started

```bash
# Install dependencies
npm install

# Start backend
npm run dev --workspace=apps/backend

# Start mobile (Expo)
npm run dev --workspace=apps/mobile

# Start web dashboard
npm run dev --workspace=apps/web

# Run all apps
npm run dev
```

## Feature Tiers

- **Free**: Voice logging, basic running, workout history
- **Premium**: AI programs, health intelligence, wearables
- **Coach**: Client management, CSV import, bulk assignment

---

*See [docs/audits/PROJECT_COMPLETION_ROADMAP.md](docs/audits/PROJECT_COMPLETION_ROADMAP.md) for current status and next steps.*
