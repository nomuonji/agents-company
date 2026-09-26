# Agents Company Decision Log

## 2026-09-27 — GitHub remote is the control plane

**Decision:** No remote database is required. GitHub remote stores the canonical company manuals, Methods, operational state, and deliverables.

**Why:** External Agents can participate with GitHub MCP alone. Git provides durable history, diffs, rollback, and optimistic writes.

---

## 2026-09-27 — Aggregate JSON is the default state model

**Decision:** The initial template stores live operational state in four known aggregate files:

- `company/state/work-items.json`
- `company/state/incidents.json`
- `company/state/managers.json`
- `company/state/manager-runs.json`

**Why:** This keeps GitHub-MCP operation and a fully static GitHub Pages Panel simple. No directory discovery, remote database, generated snapshot, or local application server is required.

**Concurrency:** GitHub blob SHA is the compare-and-swap token. A stale write fails; the Agent refetches the latest aggregate file, re-evaluates the operation, reapplies only its intended entity mutation, and retries.

**Future threshold:** shard state only after measured write contention justifies the added complexity.

---

## 2026-09-27 — GitHub Issues and PRs are auxiliary

**Decision:** Aggregate JSON remains canonical operational state.

Use GitHub Issues for human-native notification/discussion such as credentials, permissions, policy, or a human-only decision.

Use pull requests when a deliverable should be reviewed before entering the default branch.

**Why:** Issues/PRs are excellent interaction and review surfaces, but they should not become a second queue database.

---

## 2026-09-27 — SHA compare-and-swap is the default Work Item claim lock

**Decision:** Workers claim Work Items by current-SHA update of `work-items.json`.

**Why:** It is already atomic enough for the simple template: if two Workers race for the same item, only the first current-SHA update succeeds. The loser refetches and chooses again.

**Issue-based alternative considered:** an append-only Issue-comment claim ledger can deterministically choose the earliest valid claim, but it introduces a second claim state, lease/renew/release events, and more GitHub API reads. It is not the default unless measured aggregate-file contention becomes problematic.

---

## 2026-09-27 — Methods own manuals; schedulers only bootstrap

**Decision:** Manager/Worker procedures and runtime requirements live in immutable versioned Methods inside the repository.

**Why:** Scheduler prompts should not become a second configuration store.

The template starts with `general-manager@v1` and `general-worker@v1`.

---

## 2026-09-27 — Panel is GitHub Pages read-only

**Decision:** The root static Panel fetches canonical repository JSON/Markdown directly and never writes state.

**Why:** Agents already mutate GitHub remote through GitHub MCP. A write-capable local Panel would create an unnecessary second mutation path and local/remote synchronization problem.

**Deployment:** GitHub Pages can publish the `main` branch repository root directly. No application server, render step, snapshot generation, or custom Pages deployment workflow is required.
