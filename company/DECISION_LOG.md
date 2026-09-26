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


---

## 2026-09-27 — Aggregate state supersedes entity-per-file for the default template

**Decision:** The default template now stores Work Items, Incidents, Manager state, and Manager Runs in four known aggregate JSON files.

**Supersedes:** the earlier same-day decision to make every Work Item / Run / Lease / Incident a separate file.

**Why:** The default template should optimize first for simplicity, GitHub-MCP ergonomics, and a completely static GitHub Pages Panel. A handful of known JSON files eliminates directory discovery/index generation and removes the local Panel server.

**Concurrency trade-off:** unrelated Agent writes can conflict on the same aggregate file. GitHub blob SHA remains the safety primitive: stale updates fail, then the Agent refetches, re-evaluates, reapplies only its intended entity change, and retries.

**Future threshold:** shard state only after measured contention becomes operationally meaningful.

---

## 2026-09-27 — Panel is GitHub Pages read-only

**Decision:** The local read/write Panel is removed. The root static Panel fetches canonical repository JSON/Markdown directly and never writes state.

**Why:** Agents already mutate GitHub remote through GitHub MCP. A write-capable local Panel created an unnecessary second mutation path and local/remote synchronization state.

**Deployment:** GitHub Pages can publish the `main` branch repository root directly. No application server, render step, snapshot generation, or deployment Actions workflow is required.
