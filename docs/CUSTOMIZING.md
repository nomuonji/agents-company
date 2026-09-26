# Customizing Agents Company

You normally change only four things.

## 1. Company mission

Edit `company/company.json`.

Keep it broad enough to survive individual tasks, but concrete enough that a Manager can decide whether work advances it.

## 2. Manager Jobs

Create one Manager Job per independently owned mission.

Examples:
- `research-manager`
- `product-manager`
- `content-manager`
- `site-operations-manager`

Each Manager Job should have:
- measurable mission,
- Manager Method,
- default Worker Method,
- concurrency policy,
- optional ready-inventory target.

Create a matching file under `company/state/manager-leases/`.

## 3. Methods

Methods are reusable/versioned manuals.

### Research company

Manager runtime:
- GitHub
- Web/search

Worker delivery:
- Markdown/artifact files
- optional citations/evidence

### Software company

Manager runtime:
- GitHub
- optional issue tracker

Worker delivery:
- branch + PR for risky/code changes
- direct commit for safe generated artifacts when allowed

### Content / SEO company

Manager runtime:
- GitHub
- web
- analytics/search data when available

Worker delivery:
- content/code change
- explicit production/live validation

### Personal knowledge company

Manager + Worker may need only GitHub. Deliverables can be notes, structured datasets, decisions, or indexes.

## 4. External scheduler

Keep scheduler prompts thin.

A trigger should identify:
- repository,
- Manager Job or Worker role.

Everything else belongs in `AGENTS.md`, the Operating Model, Methods, and Work Items.

## Multiple Workers

You do not need one Worker process per Method. A generic external Agent can inspect candidate Work Items, resolve each Worker Method, compare runtime requirements, and claim only compatible work.

## Adding a tool

Do not add tool names only to prompts.

1. Add the tool/capability to the relevant Method version or task-specific Work Item execution requirements.
2. Let the runtime report actual availability.
3. Missing requirement should block before claim and escalate through the normal Worker→Manager route.

## Evolving the company

For important operating changes:
1. create/fix the Incident if one exists,
2. add a new immutable Method version,
3. switch the manifest `activeVersion`,
4. update Operating Model if the invariant changed,
5. record why in Decision Log.

Do not rewrite old Method version files that historical Runs/Work Items may reference.
