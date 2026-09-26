# Agents Company Decision Log

## 2026-09-27 — GitHub remote is the control plane

**Decision:** No remote database is required. GitHub stores company manuals, Methods, task/failure state, audit history, and deliverables.

**Why:** External Agents can participate with GitHub MCP alone.

---

## 2026-09-27 — GitHub Issues are Work Items and System Incidents

**Decision:** A Work Item is a GitHub Issue with `kind: work` metadata. A System Incident is a GitHub Issue with `kind: incident` metadata.

**Why:** GitHub already provides stable IDs, lifecycle, comments, history, notifications, search, human UI, and PR linking. Rebuilding those primitives in custom JSON added unnecessary state.

Machine-readable execution data lives in a hidden `agents-company:meta` JSON block in the Issue body.

---

## 2026-09-27 — Issue-specific repository files provide atomic Worker claims

**Decision:** Worker ownership is represented by `company/claims/issue-<number>.json`.

**Why:** Issue assignees and labels are useful display metadata but are not a strong mutual-exclusion primitive. GitHub file creation has the exact uniqueness property needed: two concurrent Workers cannot both create the same path.

The Issue remains canonical task state. The claim file is only a short-lived technical mutex.

---

## 2026-09-27 — Manager-only state remains repository JSON

**Decision:** `company/state/managers.json` stores Manager leases/state and `company/state/manager-runs.json` stores Run history.

**Why:** These are company-wide coordination records rather than one human-readable task/failure conversation.

They use current blob SHA as compare-and-swap.

---

## 2026-09-27 — Methods own manuals; schedulers only bootstrap

**Decision:** Manager/Worker procedures and runtime requirements live in immutable versioned Methods inside the repository.

**Why:** Scheduler prompts should not become a second configuration store.

The initial template starts with `general-manager@v1` and `general-worker@v1`.

---

## 2026-09-27 — Panel is GitHub Pages read-only

**Decision:** The static Panel never writes state.

For public repositories it reads Work/Incident Issues directly from GitHub's public REST API.

For private repositories it must use an authenticated server-side snapshot/backend; credentials are never embedded in client-side Pages JavaScript.

**Why:** Agents mutate GitHub through GitHub MCP. The Panel exists only to observe the company.
