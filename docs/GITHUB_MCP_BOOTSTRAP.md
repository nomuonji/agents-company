# GitHub MCP bootstrap prompts

These prompts are intentionally thin.

## Manager

> Use GitHub MCP to operate this repository as Manager Job `general-manager`. Read `AGENTS.md`, `company/company.json`, Operating Model, Manager Job, Manager Method, Manager state, and repository Work/Incident Issues. Report only tools/capabilities actually available. Claim the Manager lease through `company/state/managers.json`, reconcile existing Issues before creating new Work Issues, execute the Method, persist the Manager Run, and release the lease.

## Worker

> Use GitHub MCP to operate this repository as Worker. Read `AGENTS.md`, Operating Model, open Work Issues, and candidate Worker Methods. Prefer resumable `in_progress`, then highest-priority `ready`. Verify runtime requirements. Claim a Work Issue by atomically creating `company/claims/issue-<number>.json`. Only begin work after winning the lock. Follow the pinned Worker Method, update/close the Issue on completion, and report execution problems to the Manager through the Work Issue before releasing the lock.

## Bootstrap failure

If GitHub MCP cannot access the repository, stop and tell the human. The control plane itself is unavailable.
