# Architecture

## GitHub-native company

The least-capable remote Agent is assumed to have authenticated GitHub read/write access through MCP.

The core primitives are:

- GitHub Issues for Work Items and System Incidents,
- repository files for Methods, governance, Manager state, and short-lived claim locks,
- pull requests for reviewable deliverables,
- GitHub Pages for read-only human visibility.

No remote database or always-on orchestration server is required.

## Work Items and Incidents

Issue body contains a hidden machine-readable metadata block:

```text
<!-- agents-company:meta
{ ...JSON... }
-->
```

Human-readable instructions/discussion stay in normal Markdown/comments.

Work templates live under `company/templates/`.

## Atomic Worker claim

Issue #123 is protected by:

```text
company/claims/issue-123.json
```

A Worker attempts to create that path.

- first create succeeds → ownership acquired,
- later create sees existing path → claim lost,
- heartbeat updates the lock by current SHA,
- expired lock may be removed by current SHA and recreated,
- completion/problem transition updates the Issue first, then removes the lock.

This is intentionally separate from Issue assignee/labels.

## Manager state

Manager lease and Run history remain in:

- `company/state/managers.json`
- `company/state/manager-runs.json`

These use current-SHA optimistic writes.

## Pull requests

PRs are delivery/review surfaces for changes that should not land directly. Store the PR reference in the Work Issue execution receipt.

## Public GitHub Pages Panel

The root Panel calls the public repository Issues API directly and filters Issues by `agents-company:meta`.

No generated snapshot is required for a public repository.

## Private repositories

Authenticated GitHub APIs can read private Issues when the caller has repository Issues read permission.

A static browser page must not embed a reusable repository credential. Therefore a private repository needs either:

- an authenticated backend/proxy, or
- a server-side build step that writes a read-only Issue snapshot for the Panel.

See `docs/PRIVATE_REPOSITORY.md`.

## Scheduler

External scheduler prompts identify the repository + Manager Job or Worker role and tell the Agent to read `AGENTS.md`.

Detailed operating rules stay in the repository.
