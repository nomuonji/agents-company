# Agents Company — Agent Entry Contract

This repository is the company. GitHub remote is the durable control plane and canonical state store. External agents are expected to enter through GitHub MCP or another GitHub client.

Do not assume a local checkout, database, scheduler, server, or other connector exists.

## 1. Bootstrap

Every agent starts by reading:

1. `company/company.json`
2. `company/OPERATING_MODEL.md`
3. the relevant Manager Job in `company/managers/`
4. the referenced Method manifest + pinned/active version
5. canonical aggregate state files under `company/state/`

The scheduler owns **when to wake up**. It must not duplicate the manuals stored here.

If GitHub itself is unavailable, stop rather than improvising and report the bootstrap failure through the calling environment.

## 2. Canonical state

The initial/simple storage model deliberately uses a few aggregate JSON files:

- `company/state/work-items.json`
- `company/state/incidents.json`
- `company/state/managers.json`
- `company/state/manager-runs.json`

The Panel, Manager, and Worker all read the same files.

Do not create a second queue in Issues, GitHub Projects, chat memory, scheduler prompts, or a local database.

## 3. Roles

### Manager

- Owns a measurable mission.
- Observe → Reconcile → Decide → Delegate.
- Triage Worker escalations before generating more work.
- Creates executable Work Items; does not perform Worker implementation.
- Creates System Incidents only for structural / recurring / cross-task / manager-unresolvable problems.

### Worker

- Selects only executable Work Items.
- Reads Worker Method + Work Item execution contract before claim.
- Claims one Work Item by optimistic current-SHA update of `work-items.json`.
- Executes, validates, records an execution receipt, then closes or reports a problem.
- Does not normally create System Incidents directly.

## 4. Aggregate JSON concurrency

A write to an aggregate state file is an optimistic compare-and-swap:

1. Fetch the current file and retain its blob SHA.
2. Parse the latest JSON.
3. Modify only the intended entity/entities.
4. Update the same file using the fetched SHA.
5. If GitHub rejects the stale SHA, refetch the latest file.
6. Re-evaluate the operation against the new state.
7. Reapply only your intended change and retry.

Never force-overwrite a newer state file.

This simple model intentionally favors portability over maximum write parallelism. If real contention later becomes material, a future Method/Operating Model revision may shard state by Manager or Work Item.

## 5. Manager lease and run protocol

For a Manager Job:

1. Fetch `company/state/managers.json` + SHA.
2. Read `managers[managerJobId].lease`.
3. If the Job uses `skip_if_live_lease` and another live lease exists, stop.
4. Resolve the active Manager Method version.
5. Compare Method runtime requirements with tools/capabilities actually available now.
6. Create a unique Manager Run ID.
7. Update `managers.json` with the lease using the current SHA.
8. Append the Manager Run to `manager-runs.json` and pin the exact Manager Method version.
9. Run Observe → Reconcile → Decide → Delegate.
10. Finish the Manager Run and release the Manager lease.

Any stale-SHA conflict requires refetch/re-evaluation.

## 6. Work Item states

- `backlog`: deliberately deferred
- `ready`: unclaimed and executable by the intended Worker
- `running`: actively claimed with a live lease
- `in_progress`: unfinished, idle, known compatible route exists
- `blocked`: unfinished and currently not executable
- `review`: implementation + validation complete; judgment only
- `archived`: terminal history

Never use `review` as a generic failure/handoff bucket.

## 7. Worker claim protocol

1. Fetch `company/state/work-items.json` + SHA.
2. Select an executable Work Item: prefer resumable `in_progress`, then highest-priority `ready`.
3. Confirm no live claim belongs to another Agent.
4. Resolve active Worker Method version unless already pinned.
5. Merge Method runtime requirements with Work Item-specific requirements.
6. Compare with tools/capabilities actually available in this invocation.
7. Missing requirement → do not claim; update the item to `blocked` with a structured escalation to Manager.
8. Otherwise set:
   - status = `running`
   - `workerMethodVersion`
   - `claim.agentId`
   - `claim.runnerId`
   - `claim.claimedAt`
   - `claim.leaseExpiresAt`
   - runtime availability
9. Update `work-items.json` with the fetched SHA.
10. On conflict, refetch and reconsider.

Long work should heartbeat by extending its lease through the same optimistic update process.

## 8. Worker problem report

A blocked Work Item records:

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

Use `in_progress` only when a known compatible route exists.

## 9. Manager triage and System Incidents

Manager first tries to repair the Work Item: scope, validation, priority, route, or bundle.

Create/update an entry in `incidents.json` only when:

- the same class of failure recurs,
- one Work Item repair would not prevent recurrence,
- Operating Model / Method / code / schema / connector / scheduler must change,
- Manager cannot resolve through normal reconciliation,
- data loss, auth, permission, or safety boundaries are involved.

Incident resolution requires Detect → Diagnose → Repair → Regression check → Prevention.

## 10. Runtime requirements

Method versions declare required/optional tools and capabilities. Work Items may add task-specific requirements.

Agents report only tools actually available in the current invocation. Do not infer a tool merely because the repository mentions it.

## 11. Issues / PRs

Aggregate JSON state remains canonical.

Use Issues only when native human notification/discussion helps, such as credentials, permissions, policy, or a human-only decision.

Use PRs when the deliverable itself should be reviewed before entering the default branch.

Store Issue/PR references back on the canonical Work Item or Incident.

Routine queue state transitions are direct optimistic updates to aggregate state JSON, not PRs.

## 12. Completion

A Worker may archive normal work when acceptance criteria and required validation are complete.

Record:

- `resultSummary`
- `executionReceipt.deliveryStatus`
- `executionReceipt.artifacts`
- `executionReceipt.validation`
- `finishedAt`

Use `review` only when implementation and validation are complete and only judgment remains.
