# Zeroshot Guide

A practical guide to using Zeroshot - a multi-agent wrapper for Claude Code that provides adversarial validation and automatic retry loops.

## What is Zeroshot?

Zeroshot is a CLI tool that orchestrates multiple isolated Claude Code agents to complete tasks with built-in validation. Key features:

- **Multiple isolated agents** with fresh contexts checking each other's work
- **Adversarial validation** - validators didn't write the code, so they can't lie about it working
- **Automatic retry loops** - if validation fails, it fixes and retries until tests pass
- **Task complexity routing** - simple tasks get 1 agent, complex tasks get up to 9 agents with specialized validators

## Installation

```bash
# Prerequisites
npm install -g @anthropic-ai/claude-code  # Claude Code CLI
brew install gh                            # GitHub CLI (or download from GitHub releases)

# Install Zeroshot
npm install -g @covibes/zeroshot

# If npm global install fails with permission errors, configure a user directory:
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
npm install -g @covibes/zeroshot

# Authenticate
claude auth login  # Opens browser for Anthropic auth
gh auth login      # Opens browser for GitHub auth

# Verify installation
zeroshot --version
```

## Core Commands

### Running Tasks

```bash
# Full cluster (multi-agent with validation) - RECOMMENDED
zeroshot run "Your task description here"

# Single agent (no validation) - faster but less reliable
zeroshot task run "Your task description here"

# Run with PR creation when done
zeroshot run "Fix the authentication bug" --pr

# Run on a GitHub issue
zeroshot run 123  # Issue number
```

### Monitoring

```bash
# List all clusters and tasks
zeroshot list

# Check cluster status (shows tokens, cost, agent states)
zeroshot status <cluster-id>

# Follow logs in real-time
zeroshot logs <cluster-id> -f

# Attach to a running task (see live output)
zeroshot attach <task-id>

# Watch mode (TUI dashboard)
zeroshot watch

# Monitor output file directly (when run in background)
tail -f /tmp/claude/-Users-$USER-<project>/tasks/<task-id>.output

# Check for recently modified files (verify progress)
find . -type f -mmin -10 | grep -v node_modules | grep -v .git

# Check if Claude worker process is alive
ps aux | grep claude | grep -v grep
```

### Management

```bash
# Kill a running cluster
zeroshot kill <cluster-id>

# View/modify settings
zeroshot settings
zeroshot settings set claudeCommand /path/to/claude
```

## How It Works

### Task Classification

When you run a task, the **junior-conductor** (using Haiku) classifies it:

| Classification | Agents Spawned | Use Case | Observed Agent Count |
|----------------|----------------|----------|---------------------|
| `STANDARD:INQUIRY` | 2+ validators | Research, documentation, audits | 8 agents (planner + 3 validators) |
| `STANDARD:TASK` | 2+ validators | Multi-file refactoring | 7-8 agents (planner + 3 validators) |
| `CRITICAL:TASK` | 4+ validators | Complex changes, security-sensitive | 10 agents (planner + 5 validators including security + tester) |

**Note:** Agent counts vary based on task complexity. The conductor may spawn additional validators beyond the minimums shown.

### Agent Roles

| Agent | Model | Purpose |
|-------|-------|---------|
| `junior-conductor` | Haiku | Classifies task complexity |
| `senior-conductor` | Sonnet | Handles escalations |
| `planner` | Sonnet/Opus | Creates implementation plans (Opus for critical tasks) |
| `worker` | Sonnet | Executes the plan, writes code |
| `validator-requirements` | Sonnet | Verifies output meets all requirements |
| `validator-code` | Sonnet | Verifies code quality and correctness |
| `validator-security` | Sonnet | Checks for security vulnerabilities (critical tasks) |
| `validator-tester` | Sonnet | Runs test suite, verifies no regressions (critical tasks) |
| `adversarial-tester` | Sonnet | Adversarial validation with proof-of-work |
| `completion-detector` | Haiku | Detects when all validators approve |

### Workflow

```
1. ISSUE_OPENED → junior-conductor classifies
2. CLUSTER_OPERATIONS → spawn appropriate agents
3. PLAN_READY → planner creates implementation plan (if complex)
4. IMPLEMENTATION_READY → worker executes plan
5. VALIDATION_RESULT → validators check work
   - If REJECTED: worker retries with feedback
   - If APPROVED: completion-detector finalizes
6. CLUSTER_COMPLETE → all done
```

## Validation System

Validators don't just read the code - they run actual shell commands to verify:

```json
{
  "id": "AC1",
  "status": "PASS",
  "evidence": {
    "command": "grep -c 'ErrorBoundary' src/components/*.tsx",
    "exitCode": 0,
    "output": "Found 3 error boundaries as required"
  }
}
```

This makes validation trustworthy because:
- Validators have fresh context (didn't write the code)
- They verify with real commands, not just reading
- Failed validation triggers a retry loop

## Observed Behaviors

### What Works Well

1. **Research/Audit Tasks** - Zeroshot excels at comprehensive analysis
   - The first cluster we ran created a 2,465-line architecture audit
   - Validators verified with 6 acceptance criteria checks

2. **Multi-File Refactoring** - Complex tasks spawn Opus for planning
   - Created detailed 8-phase plan with file lists
   - Worker executed systematically

3. **Deletion Tasks** - Reliably removes deprecated code
   - Deleted 5 SendBlue/Plivo files and directories
   - Cleaned up all imports and references

### Gotchas

1. **Streaming Mode Error** - Sometimes fails with "only prompt commands are supported in streaming mode"
   - The worker still completes most work before failing
   - Check filesystem for changes even after failures

2. **Token Counting Lag** - `zeroshot status` may show stale token counts
   - Check the log file directly for real-time progress
   - Or check filesystem for recent file modifications

3. **Long Planning Phase** - Opus planner can take 3-5 minutes
   - This is normal for complex tasks
   - The plan quality justifies the wait

4. **PATH Issues** - Zeroshot spawns subprocesses that may not inherit PATH
   - Solution: Create symlinks in `/usr/local/bin`:
     ```bash
     sudo ln -sf ~/.npm-global/bin/claude /usr/local/bin/claude
     sudo ln -sf ~/.npm-global/bin/zeroshot /usr/local/bin/zeroshot
     ```

## Writing Good Prompts

### Key Principles

1. **Be specific about scope** - "Do NOT modify X" is as important as "Modify Y"
2. **Specify output format** - Tell it exactly what files to create/update
3. **Reference context documents** - "Read docs/audits/platform-audit.md for context"
4. **Break large tasks into phases** - Better to run 2 focused $12 tasks than 1 unfocused $30 task
5. **Set expectations** - "This is a research task only" vs "Implement the fixes"

### For Audit/Research Tasks

```
Perform a comprehensive audit of [scope] in [project].
Do NOT modify any code - this is a research/audit task only.

CONTEXT:
- Tech stack
- What you're looking for

FOCUS AREAS:
1. Area 1 (with specific examples)
2. Area 2 (with specific examples)
3. ...

OUTPUT:
Create a detailed markdown report at docs/audits/[name].md containing:
- Executive summary of findings
- Detailed findings by category
- List of critical issues
- List of warnings
- Recommendations for fixes
- File references for all findings
```

**Example from real run:**
```
Perform a comprehensive audit of the Scout platform codebase (apps/platform and packages/database).
Do NOT modify any code - this is a research/audit task only.

FOCUS AREAS:
1. AI ROUTING AND LOGIC (apps/platform/src/lib/ai/)
   - Verify all AI tool definitions are properly structured
   - Check that tool routing logic correctly maps user intents to tools

2. UI BUTTON ROUTING AND BACKEND CONNECTIVITY
   - Check all clickable UI elements in src/components/
   - Verify buttons/actions have proper event handlers

OUTPUT:
Create a detailed markdown report at docs/audits/platform-audit.md
```

**Result:** 21 minutes, $6.45, 643-line audit report with file:line references

### For Phased Implementation Tasks

When you have a complex task, split it into phases:

**Phase 1 Prompt:**
```
You are implementing fixes for [project] based on an audit at docs/audits/[name].md.
READ IT FIRST for full context.

EXECUTE ONLY PHASE 1 & 2:

## PHASE 1: CRITICAL FIXES
1. Fix 1 with specific details
2. Fix 2 with specific details

## PHASE 2: HIGH PRIORITY
3. Fix 3 with specific details
4. Fix 4 with specific details

REQUIREMENTS:
- Preserve existing functionality - do not break working features
- Follow existing code patterns
- Run tests after each phase
- All [N] tests must continue passing

OUTPUT:
After completing fixes, update docs/audits/[name].md to mark completed items.
```

**Phase 2 Prompt (after Phase 1 completes):**
```
You are completing Phase 3 & 4 of [project] remediation.
Phase 1-2 are already complete. See docs/audits/[name].md for context.

FOCUS: Phase 3 (Type Safety) and Phase 4 (Performance) ONLY.

## PHASE 3: TYPE SAFETY
1. Specific type fix
2. Another type fix

## PHASE 4: PERFORMANCE
3. Performance improvement
4. Another performance improvement

REQUIREMENTS:
- Do NOT break existing functionality - all [N] tests must continue passing
- Follow existing code patterns

OUTPUT:
Mark all completed items in docs/audits/[name].md with ✅ status.
```

**Why this works:**
- Smaller scope = fewer validator iterations
- Clear success criteria per phase
- Can stop between phases if needed
- Better cost control ($12 + $12 vs $30 uncertain)

### For Simple Implementation Tasks

```
You are implementing [specific feature/fix] in [tech stack].

CONTEXT:
- Brief description of the app
- Relevant architectural notes

REQUIREMENTS:
1. Specific requirement 1
2. Specific requirement 2

Run tests after implementation to ensure nothing breaks.
```

## Example Session

```bash
# Start a complex implementation task
$ zeroshot run "Remove all SendBlue and Plivo messaging code. Clean up imports, types, and references."

# Output:
✓ Preflight checks passed
Starting lunar-hydra-3
Config: conductor-bootstrap

junior-conductor | ⚡ ISSUE_OPENED → task #1 (haiku)
junior-conductor | [CRITICAL:TASK] Multi-system architectural overhaul...

planner | ⚡ ISSUE_OPENED → task #1 (opus)
planner | 08:36:09 PLAN_READY
planner | ## Implementation Plan...

worker | ⚡ PLAN_READY → task #1 (sonnet)
worker | ✓ task #1 completed

validator-code | ✓ APPROVED
validator-requirements | ✓ APPROVED

completion-detector | 🎉 CLUSTER COMPLETE
```

## Cost Considerations

| Agent | Model | Approx Cost per Task |
|-------|-------|---------------------|
| Conductors | Haiku | ~$0.01 |
| Planner | Opus | ~$1.50-4.50 (complex tasks) |
| Worker | Sonnet | ~$0.50-2.00 per iteration |
| Validators (each) | Sonnet | ~$0.10-0.50 per iteration |

**Real-World Examples:**
- **Comprehensive audit** (21 minutes, 8 agents, research): **$6.45**
- **Phase 1-2 remediation** (52 minutes, 10 agents, 6 iterations): **$19.14**
- **Phase 3-4 remediation** (83 minutes, 8 agents, 5 iterations): **$11.74**

**Cost Factors:**
- Validator iterations: Each rejection + retry adds $2-4
- Task complexity: More agents = higher cost
- Code volume: Large codebases increase token usage
- Test runs: Running test suites in validation adds cost

**Budgeting Tips:**
- Simple tasks: Budget **$1-3**
- Complex tasks with validation: Budget **$10-20**
- Large audits or refactors: Budget **$20-40**
- Split large tasks into phases to control costs

## Monitoring Best Practices

### Understanding the Validation Loop

Complex tasks typically go through **3-6 iterations** before completion:

```
Iteration 1: Worker implements → Validators reject (missing items)
Iteration 2: Worker fixes → Validators reject (test failures)
Iteration 3: Worker fixes tests → Validators reject (type errors)
Iteration 4: Worker fixes types → Validators reject (edge case)
Iteration 5: Worker fixes edge case → ALL VALIDATORS APPROVE ✅
```

**This is normal and expected.** Each iteration costs $2-4. Don't kill the cluster!

### Timeline Expectations

| Task Type | Expected Duration | Iterations |
|-----------|------------------|------------|
| Simple fix | 5-15 minutes | 1-2 |
| Multi-file refactor | 20-40 minutes | 3-5 |
| Large audit | 15-30 minutes | 1-2 (research) |
| Complex remediation | 40-90 minutes | 4-7 |

### Active Monitoring Checklist

While a cluster is running, monitor:

```bash
# 1. Check cluster is alive (every 2-3 minutes)
zeroshot status <cluster-id>

# 2. Watch for progress indicators:
# - Token count increasing
# - Agent state changes (idle → executing_task)
# - Iteration numbers incrementing

# 3. Check for file modifications (every 5 minutes)
find /path/to/project -type f -mmin -5 | grep -v node_modules

# 4. Monitor output file
tail -30 /tmp/claude/-Users-$USER-<project>/tasks/<task-id>.output

# 5. Look for these signs of progress:
# - "✓ task #N completed"
# - "TOKEN_USAGE"
# - "IMPLEMENTATION_READY"
# - "✓ APPROVED" or "✗ REJECTED"
```

### When to Be Patient vs When to Intervene

**Be Patient When:**
- Planner is executing (can take 3-10 minutes)
- Worker is on iteration 3-6 (normal refinement)
- Token count is slowly increasing
- Agent shows "executing_task" state
- Cost is under $25 for complex tasks

**Intervene When:**
- Cluster state shows "zombie" (process died)
- No token increase for 10+ minutes
- Cost exceeds $40 without completion
- Same validation error for 4+ iterations
- Worker process not found in `ps aux | grep claude`

## Troubleshooting

### Zombie Cluster

Cluster shows `State: zombie (process died)`:

```bash
# Check the logs
ls -la ~/.claude-zeroshot/logs/ | grep <cluster-name>
cat ~/.claude-zeroshot/logs/<cluster-name>-*.log

# Check what was completed before death
find . -type f -mmin -60 | grep -v node_modules

# Kill the zombie
zeroshot kill <cluster-id>

# Resume or restart
zeroshot resume <cluster-id>  # Try to resume
# OR
zeroshot run "<task>"  # Start fresh
```

### Cluster Stuck (No Progress)

```bash
# Check what's running
zeroshot list

# Check the specific task log
cat ~/.claude-zeroshot/logs/<task-id>.log

# Check if Claude process is running
ps aux | grep claude

# If truly stuck (10+ min no token change), kill and restart
zeroshot kill <cluster-id>
```

### Worker Fails But Made Progress

Check the filesystem for changes:
```bash
# Find recently modified files
find . -type f -mmin -15 | grep -v node_modules | grep -v .git
```

### Validators Reject Work

The worker will automatically retry with the feedback. **This is normal!** Complex tasks often require 4-6 iterations. Each validator rejection includes specific feedback:

```json
{
  "approved": false,
  "errors": [
    "ScoutPanel.tsx:176-190 - Type error: Properties 'response', 'toolCalls' accessed on 'unknown' type",
    "useDeals.ts:114 - Property 'id' does not exist on type 'UpdateDealParams'"
  ]
}
```

The worker reads this feedback and fixes the issues on the next iteration. If stuck on the same error for 4+ iterations, consider killing and restarting with a clearer prompt.

### Long Running Tasks

For tasks expected to take 30+ minutes:

```bash
# Run in background (returns immediately)
zeroshot run "your prompt" &

# Or use Ctrl+C to detach (cluster keeps running)
# Then monitor with:
zeroshot list
zeroshot status <cluster-id>

# Check progress periodically
watch -n 60 'zeroshot status <cluster-id>'
```

### Tests Keep Failing

If validators reject due to test failures:

```bash
# Check what tests are failing
cd /path/to/project
npm test

# The worker is trying to fix them, but if it's stuck:
# 1. Check if tests pass locally (they should before starting)
# 2. Review validator feedback for patterns
# 3. If same test fails 3+ times, it may need manual intervention
```

## Files and Locations

| Path | Purpose |
|------|---------|
| `~/.claude-zeroshot/` | Zeroshot data directory |
| `~/.claude-zeroshot/logs/` | Task log files |
| `~/.claude-zeroshot/settings.json` | Configuration |
| `~/.zeroshot/sockets/` | Unix sockets for task communication |

## Using for Project Planning

Zeroshot works well for creating validated project plans:

```bash
zeroshot run "Create a comprehensive implementation plan for adding user authentication to this app. Include: database schema changes, API endpoints, frontend components, security considerations. Do NOT implement - only create the plan document."
```

The validators will verify:
- All requirements are addressed
- Plan is technically feasible
- No gaps in the approach

You get a reviewed, validated plan document as output.

## Lessons Learned from Real Usage

### The Importance of Patience

**ZeroShot is thorough, not fast.** A comprehensive audit + remediation took:
- Audit: 21 minutes, 1 cluster
- Remediation Phase 1-2: 52 minutes, 6 iterations
- Remediation Phase 3-4: 83 minutes, 5 iterations
- **Total: ~2.5 hours for complete audit and fix of 14 issues**

This included:
- Reading hundreds of files
- Writing/modifying 30+ files
- Running test suite 10+ times
- Multiple validation rounds

The alternative (manual work) would take days.

### Trust the Validation Process

When validators reject work 4-5 times in a row, it feels frustrating. But:

1. Each rejection includes **specific, actionable feedback**
2. The worker learns from each iteration
3. The final result is **thoroughly validated**
4. All 548 tests passed with zero regressions

**Real example:** Phase 3-4 went through 5 iterations fixing:
- Iteration 1: Missing features
- Iteration 2: Type errors
- Iteration 3: Test failures
- Iteration 4: Type safety in optimistic updates
- Iteration 5: FilterBar debouncing
- **Result: ALL VALIDATORS APPROVED ✅**

### When to Split Tasks

Split into multiple runs when:
- Task has distinct phases (audit → fix phases 1-2 → fix phases 3-4)
- You want to review progress between phases
- Cost control matters ($12 + $12 + $12 is more predictable than $40)
- The scope is unclear upfront (audit first, then fix)

**Our approach:**
1. Run 1: Comprehensive audit ($6.45) → Review findings
2. Run 2: Fix Phase 1-2 critical items ($19.14) → Review progress
3. Run 3: Fix Phase 3-4 code quality ($11.74) → Done!

Total: $37.33 with review points vs unknown cost for one massive run

### What ZeroShot Does Better Than Manual

1. **Systematic coverage** - Found 18 unregistered AI tools that worked but were never wired up
2. **Cross-file consistency** - Updated types across 30+ files consistently
3. **Test validation** - Ran 548 tests after every change, caught regressions immediately
4. **Documentation** - Updated audit doc with ✅ markers automatically
5. **Pattern following** - Matched existing code style perfectly

### What Still Needs Human Judgment

1. **Breaking up work** - Deciding to split into phases (we made this call)
2. **Reviewing costs** - Monitoring budget and deciding when to proceed
3. **Final verification** - Sanity checking the results make sense
4. **Prompt refinement** - Adjusting scope when initial attempt is too broad

### Key Takeaway

ZeroShot is **autonomous but not automatic**. It needs:
- Clear, well-scoped prompts
- Patient monitoring (not micromanaging)
- Trust in the validation process
- Human judgment on task boundaries

When used correctly, it delivers **production-ready, tested, validated code** that would take days to produce manually.
