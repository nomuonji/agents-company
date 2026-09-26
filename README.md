# Agents Company

A **GitHub-native agent company template**.

GitHub remote is the control plane. **GitHub Issues are the Work Item / System Incident database.** External agents enter through GitHub MCP. Humans observe the same state through a read-only GitHub Pages Panel.

No remote database or application server is required for the default public-repository setup.

```text
Human
  ↓ mission / boundaries
Manager
  ↓ Observe → Reconcile → Decide → Delegate
GitHub Issue = Work Item
  ↓
Worker
  ↓ claim → execute → validate → deliver
Manager
  ↓ escalation / Incident Issue / improvement
```

## Core idea

> **The scheduler is the alarm clock. GitHub is the company.**

The repository owns:

- `AGENTS.md` — external Agent entry contract
- `company/OPERATING_MODEL.md` — current company rules
- `company/DECISION_LOG.md` — why important operating choices changed
- `company/managers/` — mission-owning Manager Jobs
- `company/methods/` — versioned Manager/Worker manuals + runtime requirements
- GitHub Issues — Work Items and System Incidents
- `company/claims/` — short-lived Worker claim mutexes
- `company/state/managers.json` — Manager leases/state
- `company/state/manager-runs.json` — Manager Run history
- `workspace/` — mission-specific deliverables
- root `index.html / panel.js / panel.css` — read-only human Panel

## Work Item = GitHub Issue

A Work Item is a normal GitHub Issue with a hidden machine-readable metadata block in its body.

Example:

```markdown
<!-- agents-company:meta
{
  "schemaVersion": 1,
  "kind": "work",
  "status": "ready",
  "priority": "high",
  "managerJobId": "general-manager",
  "workerMethod": { "id": "general-worker", "version": "active" },
  "workerMethodVersion": null,
  "execution": {
    "requiredTools": ["github"],
    "requiredCapabilities": ["repo_read", "repo_write"],
    "validationStrategy": { "type": "explicit", "checks": [] },
    "deliveryMode": "direct_commit"
  }
}
-->

## Objective

Produce the requested deliverable.

## Acceptance criteria

- ...
```

This lets GitHub provide the things it already does well:

- IDs/numbers,
- human-readable UI,
- comments,
- notifications,
- search,
- history,
- links to PRs,
- open/closed lifecycle.

The hidden JSON provides the Agent contract.

Templates live under `company/templates/` and `.github/ISSUE_TEMPLATE/`.

## Atomic Work Item claim

The Issue is the task. A tiny Issue-specific repository file is the mutex:

```text
company/claims/issue-123.json
```

Worker claim:

1. Read Issue #123 and its Worker Method.
2. Verify runtime requirements.
3. If no live lock exists, attempt GitHub **create file** for `company/claims/issue-123.json`.
4. Only one concurrent create can win.
5. Winner updates Issue metadata to `running`.
6. Loser chooses another Issue.

Heartbeat extends the lock lease using current-SHA update.

Completion/problem transition updates the Issue first, then deletes the lock.

Issue assignees/labels may improve visibility but are not the ownership lock.

## Manager state

Manager leases and Run history are the only remaining aggregate repository state:

```text
company/state/
  managers.json
  manager-runs.json
```

They use GitHub blob-SHA optimistic writes.

## Methods, not scheduler manuals

Schedulers own **when** to wake an Agent.

Detailed behavior belongs in versioned Manager/Worker Methods inside the repository.

See [docs/GITHUB_MCP_BOOTSTRAP.md](docs/GITHUB_MCP_BOOTSTRAP.md).

## Read-only GitHub Pages Panel

The root Panel is static:

```text
index.html
panel.js
panel.css
```

For this public repository, it reads Work/Incident Issues directly from GitHub's public REST API and reads Methods/governance files from GitHub Pages.

### Publish it

```text
Settings
→ Pages
→ Build and deployment
→ Source: Deploy from a branch
→ Branch: main
→ Folder: / (root)
→ Save
```

No custom Actions deployment workflow is required for this public default.

### Private repositories

Private repository Issues require authenticated GitHub API access. Do **not** put a token in browser JavaScript.

Options are described in [docs/PRIVATE_REPOSITORY.md](docs/PRIVATE_REPOSITORY.md).

Important: a Pages site sourced from a private repository is not automatically private. Treat any static snapshot published to a public Pages site as public data.

## Validation

Repository-side control-plane files remain zero-dependency:

```bash
npm test
npm run validate
```

The manual workflow `.github/workflows/validate-manual.yml` is optional and does not run on every push.

## Customize

1. Edit `company/company.json`.
2. Define Manager Jobs.
3. Create Manager/Worker Method v1s.
4. Initialize Manager state.
5. Let Managers create Work Issues.
6. Invoke Managers/Workers externally through GitHub MCP.
7. Put deliverables under `workspace/` or normal monorepo packages/apps.

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
│  ├─ claims/
│  ├─ managers/
│  ├─ methods/
│  │  ├─ manager/
│  │  └─ worker/
│  ├─ state/
│  │  ├─ managers.json
│  │  └─ manager-runs.json
│  └─ templates/
├─ packages/core/
├─ schemas/
├─ docs/
├─ workspace/
└─ .github/
```

Read [AGENTS.md](AGENTS.md) and [company/OPERATING_MODEL.md](company/OPERATING_MODEL.md) before changing the control plane.
