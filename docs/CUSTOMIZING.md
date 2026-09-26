# Customizing Agents Company

## 1. Company mission

Edit `company/company.json`.

Also update `github.repositoryFullName` after copying/forking the template if needed.

## 2. Manager Jobs

Create one Manager Job per independently owned mission and add its ID to `company/company.json > managerJobIds`.

Initialize its Manager state inside `company/state/managers.json`.

Examples:

- research-manager
- product-manager
- content-manager
- site-operations-manager

## 3. Methods

Methods are reusable/versioned manuals.

### Research company

Manager runtime:
- GitHub
- web/search

Worker delivery:
- Markdown/data artifacts
- citations/evidence

### Software company

Worker delivery may use:
- direct commits for low-risk changes,
- PRs for reviewable code/config changes.

### Content / SEO company

Work Issues can specify:
- web research,
- analytics/search data,
- production/live validation.

### Personal knowledge company

Work Issues can represent research, note synthesis, indexing, or structured datasets.

## 4. Work Items

Create a GitHub Issue using `company/templates/work-issue.md` or the repository Issue template.

The machine-readable metadata block selects Manager Job, Worker Method, priority, execution requirements, and status.

## 5. Incidents

Create an Incident Issue only for structural/recurrent/cross-task failures.

Use `company/templates/incident-issue.md`.

## 6. Multiple Workers

Workers inspect repository Issues, resolve candidate Worker Methods, and claim only compatible Work Issues.

Atomic ownership uses the Issue-specific lock file under `company/claims/`, so two Workers do not execute the same Issue concurrently.

## 7. External scheduler

Keep scheduler prompts thin.

A trigger identifies:

- repository,
- Manager Job or Worker role.

Everything else belongs in `AGENTS.md`, Operating Model, Methods, and Issues.

## 8. Adding a tool

1. Add the tool/capability to the relevant Method or Work Issue metadata.
2. Let the runtime report actual availability.
3. Missing requirements prevent claim and escalate through Worker → Manager.

## 9. Evolving the company

For important operating changes:

1. create/fix the Incident Issue if one exists,
2. add a new immutable Method version,
3. switch the manifest `activeVersion`,
4. update Operating Model if the invariant changed,
5. record why in Decision Log.

Do not rewrite historical Method versions after they have been used.
