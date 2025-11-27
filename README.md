# VoiceFit 2.0

A voice-first fitness tracking application with AI coaching, personalized programs, and GPS running.

## Quick Links

| Document | Description |
|----------|-------------|
| [Master Plan](docs/implementation/MASTER_PLAN.md) | Technology decisions, feature tiers, status |
| [Task List](docs/implementation/TASK_LIST.md) | 156 tasks across 11 phases |
| [UI Specification](docs/UI_SPECIFICATION.md) | Design system, colors, typography |
| [API Reference](docs/implementation/API_REFERENCE.md) | tRPC router documentation |

## Project Structure

```
apps/
├── backend/          # tRPC + Drizzle + PostgreSQL (85% complete)
├── mobile/           # React Native + Expo (in progress)
└── web/              # Next.js Coach Dashboard (planned)

docs/
├── implementation/   # Active planning documents
├── reference/        # Source specifications
└── archive/          # Historical documents
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native, Expo, Expo Router |
| State | Zustand |
| Offline | PowerSync |
| Backend | tRPC, Drizzle ORM |
| Database | Supabase (PostgreSQL) |
| AI | Grok (xAI) |
| Search/RAG | Upstash Search |

## Getting Started

```bash
# Install dependencies
pnpm install

# Start backend
pnpm --filter backend dev

# Start mobile
pnpm --filter mobile start
```

## Feature Tiers

- **Free**: Voice logging, basic running, workout history
- **Premium**: AI programs, health intelligence, wearables
- **Coach**: Client management, CSV import, bulk assignment

---

*See [docs/implementation/](docs/implementation/) for detailed planning.*
