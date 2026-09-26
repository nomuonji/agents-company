# Agents Company — Agent Entry Contract

This repository is the company. GitHub remote is the durable control plane and canonical state store. External agents are expected to enter through GitHub MCP or another GitHub client.

Do not assume a local checkout, database, scheduler, server, or other connector exists.

## 1. Bootstrap

Every agent starts by reading:

1. `company/company.json`
2. `company/OPERATING_MODEL.md`
3. the relevant Manager Job in `company/managers/`
4. the referenced Method manifest + pinned/active version
5. Manager state files under `company/state/`
6. repository Issues for Work Items / Incidents

The scheduler owns **when to wake up**. It must not duplicate the manuals stored here.

If GitHub itself is unavailable, stop rather than improvising and report the bootstrap failure through the calling environment.

## 2. Canonical state

- Work Item = GitHub Issue with `kind: work`
- System Incident = GitHub Issue with `kind: incident`
- Worker claim lock = `company/claims/issue-<number>.json`
- Manager current state = `company/state/managers.json`
- Manager Run history = `company/state/manager-runs.json`
- Methods = `company/methods/`

Do not create a second Work queue in JSON, Projects, chat memory, or scheduler prompts.

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
- Claims one Work Issue by creating its unique Issue lock file.
- Executes, validates, records an execution receipt, then closes or reports a problem.
- Does not normally create System Incidents directly.

## 4. Issue metadata

Issue body contains a hidden machine-readable block:

```text
<!-- agents-company:meta
{ ...valid JSON... }
-->
```

Work template: `company/templates/work-issue.md`

Incident template: `company/templates/incident-issue.md`

Human-readable Markdown remains outside the metadata block.

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

For Issue #N, the lock path is:

```text
company/claims/issue-N.json
```

1. Read the open Work Issue and resolve its Worker Method.
2. Verify runtime requirements.
3. If a live lock file exists, skip this Issue.
4. If an expired lock exists, remove it using its current SHA.
5. Attempt to create the Issue-specific lock path.
6. Create succeeds → claim won.
7. Create reports the path already exists → claim lost; choose another Issue.
8. Winner pins the Worker Method version and updates Issue metadata to `running`.
9. Heartbeat by updating the lock lease with its current SHA.

The unique file path is the atomic ownership primitive.

## 8. Worker problem report

On a problem, update Work Issue metadata to `blocked` or `in_progress` and add a structured Issue comment with category, symptom, attempts, evidence, required capability, and next possible step.

Use `in_progress` only when a known compatible route exists. Release the lock after the Issue transition is recorded.

## 9. Manager triage and System Incidents

Manager first tries to repair the Work Item: scope, validation, priority, route, or bundle.

Create or update an Incident Issue only when:

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

Work Items and Incidents are already Issues, so their comments are the normal human/Agent discussion surface.

Use PRs when the deliverable itself should be reviewed before entering the default branch.

Store PR references in the Work Issue execution receipt.

## 12. Completion

A Worker may archive normal work when acceptance criteria and required validation are complete.

Record:

- `resultSummary`
- `executionReceipt.deliveryStatus`
- `executionReceipt.artifacts`
- `executionReceipt.validation`
- `finishedAt`

Use `review` only when implementation and validation are complete and only judgment remains.
