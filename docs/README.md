# VoiceFit Documentation

## Active Documents

### Implementation Planning
Located in `implementation/`:

| Document | Purpose |
|----------|---------|
| **MASTER_PLAN.md** | Technology decisions, feature tiers, current status |
| **TASK_LIST.md** | 156 tasks across 11 phases |
| **BADGE_DEFINITIONS.md** | All 90 badges with unlock criteria |
| **SCREEN_INVENTORY.md** | 32 mobile screens with navigation |
| **API_REFERENCE.md** | tRPC router documentation |

### Design & Reference
| Document | Purpose |
|----------|---------|
| **UI_SPECIFICATION.md** | Complete design system (colors, typography, spacing) |
| **AI_PROMPTS_REFERENCE.md** | AI service prompts and configurations |
| **reference/FEATURE_EXTRACTION_SPECIFICATION.md** | Original feature extraction |

## Archived Documents

Old planning documents are in `archive/`. See `archive/README.md` for details.

These are kept for historical reference but should **not** be used for development decisions.

## Quick Reference

### Current Decisions
- **Navigation**: 3 tabs (Home - Chat - Run) + profile avatar
- **Offline**: PowerSync
- **State**: Zustand
- **AI**: Grok (single provider)
- **CrossFit UI**: Excluded (backend only)
- **AI Programs**: Premium only

### What to Read First
1. `implementation/MASTER_PLAN.md` - Overall status and decisions
2. `implementation/TASK_LIST.md` - What needs to be done
3. `UI_SPECIFICATION.md` - How it should look
