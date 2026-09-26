# Agents Company — Agent Entry Contract

This repository is the company. Git is the durable control plane; `company/` is the operational state store.

External agents are expected to enter through GitHub MCP or another GitHub client. Do not assume a local shell, database, scheduler, or other connector exists.

## 1. Bootstrap

Every agent starts by reading, in this order:

1. `company/company.json`
2. `company/OPERATING_MODEL.md`
3. the relevant Manager Job in `company/managers/`
4. the referenced Method manifest + pinned/active version under `company/methods/`
5. current state under `company/state/`

The scheduler owns **when to wake up**. It should not duplicate the manuals stored here.

If GitHub itself is unavailable, the repository cannot record an Incident. Stop rather than improvising and report the bootstrap failure to the human through the calling environment.

## 2. Roles

### Manager
- Owns a measurable mission.
- Observe → Reconcile → Decide → Delegate.
- Triage Worker escalations before generating more work.
- Creates executable Work Items; does not perform the underlying Worker task.
- Creates System Incidents only for structural / recurring / cross-task / manager-unresolvable problems.

### Worker
- Selects only executable Work Items.
- Reads the Worker Method and Work Item execution contract before claim.
- Claims one Work Item atomically by updating that Work Item file with its current GitHub blob SHA.
- Executes, validates, records a receipt, then closes or reports a problem.
- Does not normally create System Incidents directly.

## 3. Canonical state

Each entity is a separate file to reduce write contention.

- Manager Jobs: `company/managers/*.json`
- Manager leases: `company/state/manager-leases/*.json`
- Manager Runs: `company/state/manager-runs/*.json`
- Work Items: `company/state/work-items/*.json`
- Incidents: `company/state/incidents/*.json`
- Methods: `company/methods/<role>/<method>/...`

Do not create a second queue in Issues, Projects, chat memory, or scheduler prompts.

## 4. Manager lease and run protocol

For a Manager Job:

1. Fetch `company/state/manager-leases/<managerJobId>.json` and keep its blob SHA.
2. If `leaseExpiresAt` is still in the future for another actor, do not start another Manager cycle when the Job uses `skip_if_live_lease`.
3. Resolve the Manager Method active version and compare its runtime requirements with tools/capabilities actually available now.
4. Create a unique Manager Run ID.
5. Claim the lease with a current-SHA update:
   - `claimedBy`
   - `runnerId`
   - `claimedAt`
   - `leaseExpiresAt`
   - `managerRunId`
6. Create `company/state/manager-runs/<runId>.json` and pin the exact Manager Method version.
7. Run Observe → Reconcile → Decide → Delegate.
8. Finish the Manager Run, then release the lease with another current-SHA update.

If the lease SHA update conflicts, refetch and reconsider. Never force-overwrite another Manager.

## 4. Work Item states

- `backlog`: deliberately deferred
- `ready`: unclaimed and executable by the intended Worker
- `running`: actively claimed with a live lease
- `in_progress`: unfinished, idle, known compatible route exists
- `blocked`: unfinished and currently not executable
- `review`: implementation + validation complete; judgment only
- `archived`: terminal history

Never use `review` as a generic failure/handoff bucket.

## 5. Atomic claim protocol over GitHub MCP

For a Work Item:

1. Fetch `company/state/work-items/<id>.json` and keep the returned blob SHA.
2. Confirm status is claimable and any existing lease is expired.
3. Resolve the Work Item's Worker Method active version if `workerMethodVersion` is not yet pinned.
4. Compare Method + Work Item runtime requirements with tools/capabilities actually available in this invocation.
5. If requirements are missing, do **not** claim. Record a Worker escalation on the Work Item and move it to `blocked`.
6. Otherwise update the same Work Item using the fetched SHA:
   - status = `running`
   - claim.agentId / runnerId / claimedAt / leaseExpiresAt
   - pin `workerMethodVersion`
7. If the SHA update conflicts, another actor changed the item. Refetch and reconsider; never force-overwrite.

GitHub's content-SHA precondition is the concurrency primitive.

Long work should heartbeat by extending `claim.leaseExpiresAt` with another current-SHA update.

## 6. Worker problem report

On an execution problem, update the Work Item with:

```json
{
  "status": "blocked",
  "escalation": {
    "status": "reported",
    "reportedTo": "manager",
    "category": "capability | safety | external_dependency | state | validation | tool_error | unknown",
    "symptom": "...",
    "attempted": [],
    "evidence": [],
    "requiredCapability": null,
    "nextPossibleStep": null
  }
}
```

Use `in_progress` instead of `blocked` only when a known compatible route exists.

## 7. Manager triage and Incidents

Manager first tries to fix the Work Item itself: scope, bundle, validation, priority, route.

Create `company/state/incidents/<id>.json` only when:
- the same class of failure recurs,
- one Work Item fix would not prevent recurrence,
- Operating Model / Method / code / schema / connector / scheduler must change,
- Manager cannot resolve through normal reconciliation,
- data loss, auth, permissions, or safety boundaries are involved.

Incident resolution requires:
Detect → Diagnose → Repair → Regression check → Prevention.

## 8. Runtime requirements

Methods declare required and optional tools/capabilities. Work Items can add task-specific requirements.

Agents report only tools actually available in the current invocation. Do not infer a tool merely because the repository mentions it.

## 9. GitHub Issues / PRs

Repository files remain canonical state.

Use Issues only when native human notification/discussion is useful, such as:
- human-only credential/action request,
- policy/product decision,
- long discussion that benefits from GitHub conversation.

Link the Issue number from the canonical Work Item/Incident.

Use PRs when the deliverable itself should be reviewed before entering the default branch:
- code change,
- high-risk configuration,
- content requiring explicit approval.

Link the PR from `executionReceipt.artifacts`.

Routine state transitions should be direct current-SHA updates to the state file, not PRs.

## 10. Completion

A Worker can archive normal work without Manager approval when acceptance criteria and validation are satisfied.

A completed Work Item records:

- `resultSummary`
- `executionReceipt.deliveryStatus`
- `executionReceipt.artifacts`
- `executionReceipt.validation`
- `finishedAt`

Use `review` only when implementation and validation are done and a judgment remains.
