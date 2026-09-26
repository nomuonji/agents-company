# Customizing Agents Company

## 1. Company mission

Edit `company/company.json`.

## 2. Manager Jobs

Create one Manager Job per independently owned mission and add its ID to `managerJobIds`.

Initialize its lease/state in `company/state/managers.json`.

## 3. Methods

Methods are reusable, immutable, versioned manuals.

Examples:

### Research company
- Manager: GitHub + web/search
- Worker: research + evidence + Markdown/artifacts

### Software company
- Manager: GitHub + optional tracker
- Worker: implementation + tests + PR/direct commit

### Content / SEO company
- Manager: GitHub + web + analytics/search evidence
- Worker: content/code change + production validation

### Personal knowledge company
- GitHub-only may be enough
- Work Issues can request notes, structured data, indexes, or decisions

## 4. Work Item schema

Managers create GitHub Issues from `company/templates/work-issue.md`.

Task-specific runtime requirements and validation strategy live in the hidden Issue metadata.

## 5. Multiple Workers

A generic Worker searches open Work Issues, resolves candidate Worker Methods, checks runtime, and attempts the Issue-specific claim file.

Workers racing for the same Issue cannot both create the same claim path.

## 6. External scheduler

Keep scheduler prompts thin:

- repository,
- Manager Job or Worker role.

Everything else belongs in `AGENTS.md`, the Operating Model, Methods, and Work Issues.

## 7. Adding a tool

1. Add it to the Method or Work Issue runtime requirements.
2. Let the Agent report actual availability.
3. Missing requirements block before claim and escalate Worker → Manager.

## 8. Evolving the company

For important operating changes:

1. create/fix the Incident Issue when applicable,
2. add a new immutable Method version,
3. switch manifest `activeVersion`,
4. update Operating Model if the invariant changed,
5. record why in Decision Log.

Do not rewrite old Method version files that historical executions may reference.
