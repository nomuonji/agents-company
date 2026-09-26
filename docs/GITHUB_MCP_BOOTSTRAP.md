# GitHub MCP bootstrap prompts

## Manager

> Use GitHub MCP to operate this repository as Manager Job `general-manager`. Read `AGENTS.md`, `company/company.json`, the Operating Model, Manager Job, and active/pinned Manager Method. Report only tools/capabilities actually available. Claim the Manager lease by current-SHA update, run the Method, persist the Manager Run, and release the lease. Do not duplicate the manual in this prompt.

## Worker

> Use GitHub MCP to operate this repository as Worker. Read `AGENTS.md`, the Operating Model, open Work Items, and candidate Worker Methods. Prefer resumable `in_progress`, then highest-priority `ready`. Verify runtime requirements, claim by current-SHA update, pin the active Worker Method version, and follow it. Missing capability or execution failure goes to the Manager as a structured Work Item escalation.

## Bootstrap failure

If GitHub MCP cannot access the repository, stop and tell the human. The control plane itself is unavailable, so an internal Incident cannot reliably be persisted.
