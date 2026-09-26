# Agents Company

A **GitHub-native agent company template**.

GitHub remote is the control plane, durable state store, audit log, and delivery workspace. External agents enter through GitHub MCP. Humans observe the same canonical state through a read-only GitHub Pages Panel.

No remote database or application server is required.

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

## Core idea

> **The scheduler is the alarm clock. The repository is the company.**

The repository owns:

- `AGENTS.md` — external Agent entry contract
- `company/OPERATING_MODEL.md` — current company rules
- `company/DECISION_LOG.md` — why important operating choices changed
- `company/managers/` — mission-owning Manager Jobs
- `company/methods/` — versioned Manager/Worker manuals + runtime requirements
- `company/state/*.json` — canonical operational state
- `workspace/` — mission-specific deliverables
- root `index.html / panel.js / panel.css` — read-only human Panel

## Simple aggregate state

The default template starts with four known JSON files:

```text
company/state/
  work-items.json
  incidents.json
  managers.json
  manager-runs.json
```

This keeps GitHub MCP usage and GitHub Pages rendering extremely simple.

### Claim / write concurrency

Agents use the current GitHub blob SHA as compare-and-swap:

1. fetch the aggregate JSON + SHA,
2. inspect the latest state,
3. modify only the intended Work Item / Incident / Manager entry,
4. update the file using that SHA,
5. stale SHA → refetch, re-evaluate, reapply only that intended change.

The template intentionally accepts occasional retries before introducing sharded state.

## Methods, not scheduler manuals

Schedulers own **when** to wake an Agent.

Detailed execution behavior belongs in versioned Manager/Worker Methods inside the repository.

See [docs/GITHUB_MCP_BOOTSTRAP.md](docs/GITHUB_MCP_BOOTSTRAP.md) for thin trigger prompts.

## Runtime requirements

Methods declare tools/capabilities they require. Work Items may add task-specific requirements.

An Agent reports only tools actually available in the current invocation. Missing required runtime prevents claim and follows the normal Worker → Manager escalation path.

## Issues and PRs are auxiliary

Canonical queue state stays in aggregate JSON.

Use GitHub Issues for human-native notification/discussion such as credentials, permissions, policy, or human-only decisions.

Use PRs when a deliverable should be reviewed before entering `main`.

Store Issue/PR references back on the canonical Work Item/Incident.

## Read-only GitHub Pages Panel

The Panel is already a static site at repository root:

```text
index.html
panel.js
panel.css
```

It directly fetches:

- `company/company.json`
- `company/state/work-items.json`
- `company/state/incidents.json`
- `company/state/managers.json`
- `company/state/manager-runs.json`
- Manager/Worker Method files
- Operating Model / Decision Log / Agent Contract / Architecture

There is no Node Panel server and no write API.

### Publish it

In GitHub:

```text
Settings
→ Pages
→ Build and deployment
→ Source: Deploy from a branch
→ Branch: main
→ Folder: / (root)
→ Save
```

No custom GitHub Actions deployment workflow is required for this default setup.

## Validate the repository model

Optional local/CI validation remains zero-dependency:

```bash
npm test
npm run validate
```

A manual-only workflow also exists at `.github/workflows/validate-manual.yml`; it does not consume Actions on every push.

Validation checks include:

- Manager Method references exist,
- ready Work Items have Worker Methods + validation strategies,
- running Work Items have claims + pinned Worker Method versions,
- review means validation-complete,
- duplicate open dedupe keys are rejected,
- resolved Incidents contain root cause / fix / regression / prevention.

## Customize this template

1. Edit `company/company.json`.
2. Rewrite/create Manager Jobs under `company/managers/`.
3. Add Manager IDs to `company.company.json > managerJobIds`.
4. Create immutable Manager/Worker Method versions.
5. Initialize new Manager state in `company/state/managers.json`.
6. Put mission-specific output under `workspace/` or add normal monorepo packages/apps.
7. Invoke Managers/Workers externally with GitHub MCP.

See [docs/CUSTOMIZING.md](docs/CUSTOMIZING.md).

## Repository layout

```text
agents-company/
├─ index.html
├─ panel.js
├─ panel.css
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
│  │  ├─ work-items.json
│  │  ├─ incidents.json
│  │  ├─ managers.json
│  │  └─ manager-runs.json
│  └─ templates/
├─ packages/
│  └─ core/
├─ schemas/
├─ docs/
├─ workspace/
└─ .github/
```

Read [AGENTS.md](AGENTS.md) and [company/OPERATING_MODEL.md](company/OPERATING_MODEL.md) before changing the control plane.
