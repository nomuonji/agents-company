# Agents Company Operating Model

## 1. Purpose

This repository is a portable Agent company that can run without a remote database or always-on orchestration server.

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

GitHub remote is the canonical control plane. Git history provides auditability. GitHub MCP is the default remote execution interface. GitHub Pages provides a read-only human Panel.

## 2. Separation of responsibility

- **Scheduler**: WHEN to invoke a Manager or Worker.
- **Manager Job**: WHAT outcome is owned.
- **Manager Method**: HOW management is performed.
- **Work Item**: WHAT concrete work is requested.
- **Worker Method**: HOW work is executed, validated, delivered, and reported.
- **Execution Receipt**: WHAT actually happened.
- **Incident**: WHAT was structurally wrong and how recurrence is prevented.
- **Decision Log**: WHY important operating design changed.
- **Panel**: read-only projection of canonical GitHub state.

The scheduler is never the manual. The Panel is never the database.

## 3. Canonical operational state

Work Items and System Incidents are GitHub Issues.

A Work Item Issue contains a hidden `agents-company:meta` JSON block with `kind: work`. An Incident Issue uses `kind: incident`.

Manager lease state and Manager Run history remain in:

- `company/state/managers.json`
- `company/state/manager-runs.json`

Worker claim ownership is represented by short-lived lock files under `company/claims/`.

## 4. Work Item semantics

| State | Meaning |
| --- | --- |
| backlog | Deliberately deferred from near-term execution. |
| ready | Unclaimed and executable by the intended Worker. |
| running | Actively claimed with an unexpired lease. |
| in_progress | Unfinished, idle, known compatible route exists. |
| blocked | Unfinished and currently not executable. |
| review | Implementation and validation complete; judgment remains. |
| archived | Terminal history. |

### Invariants

- Unfinished failures never go to `review`.
- `ready` requires a legitimate end-to-end execution path.
- A live claim belongs to its claimant.
- Same failure + same runtime must not be blindly retried.
- Normal successful work can go directly to `archived`.
- Manager work and Worker implementation are separate.
- Incidents are not ordinary Worker queue inventory.

## 5. Methods and version pinning

Methods are immutable by version.

- Manager Run pins the active Manager Method version at run start.
- Work Item references a Worker Method.
- Worker Method version is pinned on first successful claim.
- Method improvements do not rewrite historical execution context.

## 6. Runtime requirements

Method version JSON declares required/optional tools and capabilities. Work Item `execution` may add requirements.

The runner reports only actual availability. Missing requirements prevent claim.

## 7. Work Bundle granularity

Bundle when repository/context/validation/release/safety boundaries align.

Split when safety, approval, locks, risk, or validation windows differ.

Default to meaningful execution bundles rather than micro-tasks.

## 8. Worker escalation

Worker problems go to Manager first. Worker updates the Work Issue to `in_progress` or `blocked`, adds a structured escalation comment, and releases the Issue claim lock.

Manager triages before generating more inventory.

## 9. System Incidents

System Incidents are GitHub Issues with `kind: incident`.

Create one for structural / recurring / cross-task failures, not every failed action.

Resolution requires:

1. Detect
2. Diagnose
3. Repair
4. Regression check
5. Prevention
6. Update Operating Model / Method / Decision Log when necessary

## 10. Human escalation

Human decisions can happen directly in the Work/Incident Issue discussion, or in a separate human-action Issue when clearer.

## 11. Pull requests

Use a PR when the deliverable needs review before merging. Routine operational state transitions do not need PRs.

## 12. Read-only GitHub Pages Panel

For public repositories, the Panel reads Work/Incident Issues from GitHub's public API and repository files from Pages.

The Panel has no write API and no local state server. Private-repository display needs an authenticated server-side snapshot or backend.

## 13. Repair workflow

When the Human says "the company seems wrong":

1. Read this Operating Model.
2. Inspect Work Items, Manager state/Runs, and Incidents.
3. Compare expected vs actual behavior.
4. Repair the narrowest correct layer.
5. Record structural failures as Incidents.
6. Record important design changes in the Decision Log.
