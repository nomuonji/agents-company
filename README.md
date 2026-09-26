# Agents Company

A **repository-native agent company template**.

The Git repository itself is the control plane, durable state store, audit log, and delivery workspace. External agents can enter through GitHub MCP; humans can inspect and edit the same state through a local Panel UI.

No remote database is required.

```text
Human
  ↓ mission / boundaries
Manager
  ↓ Observe → Reconcile → Decide → Delegate
Work Item
  ↓
Worker
  ↓ Execute → Validate → Deliver
Manager
  ↓ escalation / incidents / improvement
```

## Why this exists

Most agent systems put important operating knowledge in one of three fragile places:

- scheduler prompts,
- chat memory,
- a remote orchestration database.

Agents Company keeps the canonical operating system in the repository instead:

- `company/OPERATING_MODEL.md` — how the company should behave now
- `company/DECISION_LOG.md` — why important operating choices changed
- `company/managers/` — mission-owning Manager Jobs
- `company/methods/` — versioned Manager/Worker manuals + runtime requirements
- `company/state/` — Work Items, Manager Runs, leases, Incidents
- `workspace/` — the mission-specific code/content/artifacts the company produces
- `AGENTS.md` — exact entry contract for GitHub-MCP agents

## Core properties

### No remote DB

Each operational entity is a separate JSON file. Git gives you:

- durability,
- history,
- diffs,
- rollback,
- portability,
- optimistic concurrency.

### GitHub-MCP-native claims

Work Item claim uses GitHub's current blob SHA as compare-and-swap:

1. fetch Work Item + SHA,
2. verify status/lease,
3. resolve and pin Worker Method version,
4. compare required runtime with actually available tools,
5. update that same path using the fetched SHA.

A stale update fails instead of silently overwriting another Agent's claim.

### Methods, not scheduler manuals

Schedulers own **when** to wake an Agent.

The repository owns:

- Manager Method,
- Worker Method,
- runtime requirements,
- state semantics,
- validation,
- Incident policy.

See [docs/GITHUB_MCP_BOOTSTRAP.md](docs/GITHUB_MCP_BOOTSTRAP.md) for intentionally thin trigger prompts.

### Issues and PRs are auxiliary

Canonical queue state stays under `company/state/`.

Use GitHub Issues when humans benefit from native notification/discussion. Use PRs when the actual deliverable should be reviewed before merging. Store links back on the canonical Work Item/Incident.

## Local Panel UI

The Panel is deliberately local and file-backed. It is **not another state service**.

Requirements: Node.js 22+.

```bash
git clone https://github.com/nomuonji/agents-company.git
cd agents-company
npm run panel
```

Open:

```text
http://localhost:4310
```

The Panel shows:

- company mission and office flow,
- Manager Jobs,
- Work Board,
- claims/statuses,
- System Incidents,
- Manager/Worker Methods + runtime requirements,
- Operating Model / Decision Log / Agent Contract / Architecture,
- local Git dirty state.

Human edits from the Panel write local repository files. Commit/push them to publish the new canonical state to remote Agents.

## Validate the company

No install is required for the current zero-dependency implementation.

```bash
npm test
npm run validate
```

`npm run validate` checks important invariants such as:

- Manager Method references exist,
- ready Work Items have Worker Methods + validation strategies,
- running Work Items have claims,
- review means validation-complete,
- duplicate open dedupe keys are rejected,
- resolved Incidents contain root cause / fix / regression / prevention.

## Customize this template

For a new company:

1. Edit `company/company.json`.
2. Rewrite the mission in `company/managers/general-manager.json`.
3. Create or revise Manager Method versions.
4. Create or revise Worker Method versions.
5. Put mission-specific deliverables under `workspace/` or add your own monorepo packages/apps.
6. Use the bootstrap prompts with any scheduler/agent runtime that can reach GitHub.

Do not put detailed work manuals back into the scheduler.

## Repository layout

```text
agents-company/
├─ AGENTS.md
├─ company/
│  ├─ company.json
│  ├─ OPERATING_MODEL.md
│  ├─ DECISION_LOG.md
│  ├─ managers/
│  ├─ methods/
│  │  ├─ manager/
│  │  └─ worker/
│  ├─ state/
│  │  ├─ manager-leases/
│  │  ├─ manager-runs/
│  │  ├─ work-items/
│  │  └─ incidents/
│  └─ templates/
├─ apps/
│  └─ panel/
├─ packages/
│  ├─ core/
│  └─ cli/
├─ docs/
├─ workspace/
└─ .github/
```

## The important design rule

> **The scheduler is the alarm clock. The repository is the company.**

Read [AGENTS.md](AGENTS.md) and [company/OPERATING_MODEL.md](company/OPERATING_MODEL.md) before modifying the control plane.
