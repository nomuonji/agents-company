# Architecture

## GitHub is the platform

The least-capable Agent is assumed to have authenticated GitHub read/write access through MCP.

The system uses GitHub primitives directly:

- Issues → Work Items / System Incidents
- Issue comments → discussion / evidence / escalation
- repository files → Methods / Operating Model / Manager state
- unique claim files → Worker mutex
- pull requests → reviewable deliverables
- Git history → audit log
- GitHub Pages → read-only human Panel

No remote database or always-on orchestration server is required.

## Work Items and Incidents

Issue body contains a hidden machine-readable metadata block:

```text
<!-- agents-company:meta
{ ...JSON... }
-->
```

Human-readable task/failure context remains regular Markdown.

Closing a completed Work Issue represents `archived`.

Closing a resolved Incident Issue represents `resolved`.

## Worker claim concurrency

For Issue #123:

```text
company/claims/issue-123.json
```

is the mutex.

Creating a previously nonexistent path is the atomic race. Only one claimant can win.

Heartbeat uses current-SHA update. Completion/problem transition updates the Issue first and then removes the lock. Expired locks are recoverable.

## Manager concurrency

Manager lease state remains in `company/state/managers.json` and uses current-SHA optimistic writes.

## GitHub Pages

### Public repository

The static Panel can call the public Issues API without authentication and fetch repository files from Pages.

No custom build is needed.

### Private repository

Private Issue API requests require authentication. Client-side Pages must not contain a personal access token or GitHub App secret.

Use either:

- an authenticated backend/proxy,
- a server-side build/snapshot that publishes only the fields safe to expose,
- or an Enterprise private Pages setup combined with an appropriate authenticated data path.

A private source repository does not by itself make ordinary Pages output confidential.

## Scheduler

The external scheduler identifies the repository + Manager Job or Worker role and tells the Agent to read `AGENTS.md`.

Detailed operating rules remain repository-owned.
