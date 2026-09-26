# GitHub MCP bootstrap prompts

These prompts are intentionally thin.

## Manager

> Use GitHub MCP to operate this repository as Manager Job `general-manager`. Read `AGENTS.md`, `company/company.json`, the Operating Model, Manager Job, and active/pinned Manager Method. Report only tools/capabilities actually available. Claim the Manager lease in `company/state/managers.json`, inspect Work/Incident Issues, reconcile the queue, create/update Issues as delegated by the Method, persist the Manager Run, and release the lease.

## Worker

> Use GitHub MCP to operate this repository as Worker. Read `AGENTS.md`, the Operating Model, and repository Issues. Ignore pull requests. Prefer compatible `in_progress` Work Issues, then highest-priority `ready` Work Issues. Resolve the Worker Method, verify runtime requirements, and claim Issue #N by creating `company/claims/issue-N.json`. If that path already exists, choose another Issue. Follow the pinned Worker Method; report execution problems back on the Work Issue.

## Bootstrap failure

If GitHub MCP cannot access the repository, stop and tell the human. The control plane itself is unavailable, so an internal Incident cannot reliably be persisted.
