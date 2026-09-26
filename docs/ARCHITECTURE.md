# Architecture

## Repository as control plane

The least-capable remote worker is assumed to have GitHub read/write access through MCP. Therefore all critical control-plane operations are reducible to repository reads and current-SHA writes.

No remote database, queue service, webhook server, or always-on daemon is required.

## Entity-per-file state

Operational entities are separate files:

- Work Items — `company/state/work-items/*.json`
- Manager Runs — `company/state/manager-runs/*.json`
- Manager leases — `company/state/manager-leases/*.json`
- Incidents — `company/state/incidents/*.json`

This keeps contention local to one entity.

## Optimistic claim concurrency

GitHub's blob SHA acts as compare-and-swap:

1. fetch Work Item and SHA,
2. verify claimability,
3. current-SHA update to `running` with lease + pinned Worker Method version,
4. stale SHA conflict means state changed; refetch.

A Manager Job uses a pre-created Manager lease file the same way.

## GitHub Issues

Issues are auxiliary human interaction:
- credentials / permissions,
- policy decisions,
- discussion-heavy human tasks.

Canonical state remains in the linked Work Item/Incident file.

## Pull requests

PRs are delivery/review surfaces for changes that should not land directly. Store the PR URL/number in the Work Item execution receipt.

## Local Panel

`npm run panel` starts a loopback-only Node server. It scans repository files and can make explicit human state edits locally. There is no Panel database.

## Scheduler

Any external scheduler may invoke an agent. The trigger should identify the Manager Job or Worker role and tell the agent to read `AGENTS.md`; it should not copy manuals/tool lists into the scheduler.
