# Agents Company Decision Log

## 2026-09-27 — GitHub remote is the control plane

**Decision:** No remote database is required. GitHub remote stores the canonical company manuals, Methods, Manager state, Work Items, Incidents, and deliverables.

**Why:** External Agents can participate with GitHub MCP alone. GitHub already provides durable history, discussion, search, IDs, notifications, and review primitives.

---

## 2026-09-27 — Work Items are GitHub Issues

**Decision:** A Work Item is a GitHub Issue with an `agents-company:meta` block whose `kind` is `work`.

**Why:** GitHub Issues already provide stable IDs, title/body, open/closed lifecycle, comments, human discussion, search, history, and PR linking. Rebuilding those features in `work-items.json` adds unnecessary state.

---

## 2026-09-27 — System Incidents are GitHub Issues

**Decision:** A structural Incident is a GitHub Issue with `kind: incident`.

**Why:** Incidents benefit from the same native discussion/history/search surface as Work Items, and they should be visible to humans without a second UI/database.

---

## 2026-09-27 — Claim ownership uses one Issue-specific lock file

**Decision:** Work Issue #N is claimed by atomically creating `company/claims/issue-N.json`.

**Why:** GitHub Issue assignees/labels are useful presentation fields but are not a strong compare-and-set ownership primitive. GitHub's create-file operation on a unique path is: only one concurrent claimant can create a previously absent lock path.

**Lease:** The lock is short-lived, heartbeat-able, and recoverable after expiry.

**Canonical task record:** The Issue remains the Work Item. The lock file is only a mutex.

---

## 2026-09-27 — Methods own manuals; schedulers only bootstrap

**Decision:** Manager/Worker procedures and runtime requirements live in immutable versioned Methods inside the repository.

**Why:** Scheduler prompts should not become a second configuration store.

The template starts with `general-manager@v1` and `general-worker@v1`.

---

## 2026-09-27 — Panel is GitHub Pages read-only

**Decision:** The root static Panel never writes company state.

For public repositories it reads Work/Incident Issues directly from GitHub's public Issues API and reads Methods/governance files from Pages.

For private repositories, private Issue data requires an authenticated server-side snapshot or backend; browser code must not contain a reusable repository credential.

**Why:** Agents already mutate GitHub remote through GitHub MCP. The human Panel should remain a projection, not another mutation path.
