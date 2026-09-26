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

Add its ID to `company/company.json > managerJobIds`.

Initialize its Manager state inside `company/state/managers.json`.

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
- content/code changes
- explicit live/production validation

### Personal knowledge company

Manager + Worker may need only GitHub. Deliverables can be notes, structured datasets, decisions, or indexes.

## 4. External scheduler

Keep scheduler prompts thin.

A trigger identifies:

- repository,
- Manager Job or Worker role.

Everything else belongs in `AGENTS.md`, the Operating Model, Methods, and Work Items.

## Multiple Workers

A generic external Agent can inspect `work-items.json`, resolve candidate Worker Methods, compare runtime requirements, and claim only compatible work.

Because Work Items share one aggregate file, concurrent writes can conflict. This is expected: refetch the latest SHA, re-evaluate, and reapply only the intended Work Item mutation.

Do not split state files preemptively. Shard only when measured contention justifies the complexity.

## Adding a tool

1. Add the tool/capability to the relevant Method version or task-specific Work Item execution requirements.
2. Let the runtime report actual availability.
3. Missing requirements block before claim and escalate through Worker → Manager.

## Evolving the company

For important operating changes:

1. create/fix the Incident if one exists,
2. add a new immutable Method version,
3. switch the manifest `activeVersion`,
4. update Operating Model if the invariant changed,
5. record why in Decision Log.

Do not rewrite old Method version files that historical Runs/Work Items may reference.
