# GitHub MCP bootstrap prompts

These prompts are intentionally thin.

## Manager

> Use GitHub MCP to operate this repository as Manager Job `general-manager`. Read `AGENTS.md`, `company/company.json`, the Operating Model, Manager Job, and active/pinned Manager Method. Report only tools/capabilities actually available. Claim the Manager lease inside `company/state/managers.json` using the current file SHA, append/update the Manager Run in `company/state/manager-runs.json`, execute the Method, and release the lease. On stale-SHA conflicts, refetch and reapply only your intended Manager state change.

## Worker

> Use GitHub MCP to operate this repository as Worker. Read `AGENTS.md`, the Operating Model, `company/state/work-items.json`, and candidate Worker Methods. Prefer resumable `in_progress`, then highest-priority `ready`. Verify runtime requirements, claim by current-SHA update of `work-items.json`, pin the active Worker Method version, and follow it. On conflict, refetch and reconsider claimability before retrying. Missing capability or execution failure goes to the Manager as a structured Work Item escalation.

## Bootstrap failure

If GitHub MCP cannot access the repository, stop and tell the human. The control plane itself is unavailable, so an internal Incident cannot reliably be persisted.
