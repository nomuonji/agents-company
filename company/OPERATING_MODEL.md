# Agents Company Operating Model

## 1. Purpose

This repository is a portable agent company. It must work without a remote database or project-specific agent platform.

```text
Human
  ↓ mission / boundaries / exceptional decisions
Manager
  ↓ observe / reconcile / decide / delegate
Work Item
  ↓
Worker
  ↓ execute / validate / deliver / report problems
Manager
  ↓ outcomes / escalation / incidents / improvement
```

Git history provides auditability. Entity-per-file state minimizes write contention. GitHub MCP provides the default remote execution interface. The local Panel provides the human control surface.

## 2. Separation of responsibility

- **Scheduler**: WHEN to invoke a Manager or Worker.
- **Manager Job**: WHAT outcome is owned.
- **Manager Method**: HOW management is performed.
- **Work Item**: WHAT concrete work is requested.
- **Worker Method**: HOW work is executed, validated, and reported.
- **Execution Receipt**: WHAT actually happened.
- **Incident**: WHAT was structurally wrong and how recurrence is prevented.
- **Decision Log**: WHY important operating design changed.

The scheduler is never the manual.

## 3. State semantics

| State | Meaning |
| --- | --- |
| backlog | Deliberately deferred from near-term execution. |
| ready | Unclaimed and executable by the intended Worker. |
| running | Actively claimed with an unexpired lease. |
| in_progress | Unfinished, idle, known compatible route exists. |
| blocked | Unfinished and currently not executable. |
| review | Implementation and validation are complete; judgment remains. |
| archived | Terminal history. |

### Invariants

- Unfinished failures never go to `review`.
- `ready` requires a legitimate end-to-end execution path.
- A live claim belongs to its claimant.
- Same failure + same runtime must not be blindly retried.
- Normal successful work can go directly to `archived`.
- Manager work and Worker work are separate.
- Incidents are not ordinary Worker queue inventory.

## 4. Methods and version pinning

Methods are immutable by version.

```text
company/methods/
  manager/<method>/
    manifest.json
    versions/v1.json
    versions/v1.md
  worker/<method>/
    manifest.json
    versions/v1.json
    versions/v1.md
```

- Manager Run pins the Manager Method version at run start.
- Work Item references a Worker Method.
- Worker Method version is pinned on first successful claim.
- Future Method improvements do not rewrite historical execution context.

## 5. Runtime requirements

Method version JSON declares:

```json
{
  "runtimeRequirements": {
    "requiredTools": ["github"],
    "requiredCapabilities": ["repo_read", "repo_write"],
    "optionalTools": [],
    "optionalCapabilities": []
  }
}
```

Work Item `execution` may add requirements. Required sets are merged.

The runner reports only actual availability. A missing requirement prevents claim.

## 6. Work Bundle granularity

Default unit is a meaningful execution bundle, not a micro-task.

Bundle when repository/context/validation/release/safety boundaries align. Split when safety, approval, locks, risk, or validation windows differ.

## 7. Worker escalation

Worker problems go to the Manager first. Worker records facts on the Work Item and releases the claim into `in_progress` or `blocked`.

Manager triages before generating more inventory.

## 8. System Incidents

Incidents are separate files because file-backed storage makes entity separation cheap and reduces queue pollution.

Create one for structural/recurring/cross-task problems, not every failed action.

Resolution requires:
1. Detect
2. Diagnose
3. Repair
4. Regression check
5. Prevention
6. Update Operating Model / Method / Decision Log when necessary

## 9. Human escalation

Use a GitHub Issue only when a human-native interaction surface is beneficial. The Incident or Work Item file remains canonical and stores `githubIssue`.

## 10. Pull requests

Use a PR when the deliverable needs review before merging. Routine operational state transitions do not need PRs.

## 11. Local Panel

The Panel reads the same files as agents. It is not another database.

It may write local state files for human actions; those changes become durable only when committed/pushed.

## 12. Repair workflow

When the human says "the company seems wrong":

1. Read this Operating Model.
2. Inspect current Work Items, Manager Runs, and Incidents.
3. Compare expected vs actual behavior.
4. Repair the narrowest correct layer.
5. Record structural failures as Incidents.
6. Record important design changes in the Decision Log.
