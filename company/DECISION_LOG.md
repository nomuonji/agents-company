# Agents Company Decision Log

## 2026-09-27 — Git repository is the control plane

**Decision:** No remote database is required. Operational entities live as separate JSON/Markdown files under `company/`.

**Why:** External agents can participate using only GitHub MCP, state is portable/forkable/auditable, and optimistic SHA writes provide a usable concurrency primitive.

---

## 2026-09-27 — Entity-per-file instead of one queue JSON

**Decision:** Each Work Item, Run, Lease, and Incident has its own file.

**Why:** Concurrent agents should not contend on one giant state document.

---

## 2026-09-27 — Issues and PRs are auxiliary

**Decision:** GitHub Issues are for human-native discussion/notification; PRs are for deliverables that benefit from review. Neither replaces canonical operational state.

**Why:** A general-purpose company needs a predictable machine-readable queue even when no Issue/PR is appropriate.

---

## 2026-09-27 — Methods own manuals, schedulers only bootstrap

**Decision:** Manager/Worker procedures and runtime requirements live in versioned Methods inside the repository.

**Why:** Scheduler prompts should not become a second configuration store.

---

## 2026-09-27 — Local Panel reads the same repository state

**Decision:** The dashboard is a local web app backed directly by repository files.

**Why:** Human visibility should not require a remote DB or duplicate state service.
