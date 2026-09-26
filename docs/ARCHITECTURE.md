# Architecture

## GitHub remote is the system of record

The least-capable Agent is assumed to have GitHub read/write access through MCP.

All critical operations reduce to:

- fetch a known repository file,
- inspect its content + blob SHA,
- optimistically update that same file,
- optionally create an Issue or PR.

No remote database, queue service, webhook server, local control-plane server, or always-on daemon is required.

## Aggregate state

The simple default uses four known JSON files:

- `company/state/work-items.json`
- `company/state/incidents.json`
- `company/state/managers.json`
- `company/state/manager-runs.json`

This makes the Pages Panel trivial because no directory discovery is required.

## Optimistic concurrency

GitHub's blob SHA acts as compare-and-swap.

For example, two Workers may both fetch `work-items.json` at SHA A. If Worker 1 writes first, SHA becomes B. Worker 2's write against A fails. Worker 2 refetches B, checks that its target item is still claimable, reapplies only that item change, and retries.

The simple model may create more retries under heavy concurrency, but it cannot silently overwrite newer state when Agents follow the current-SHA protocol.

## Why not one file per Work Item initially?

One-file-per-entity scales concurrent writes better, but requires file discovery/indexing for a fully static Pages UI and creates more repository surface area.

This template starts simple. Sharding is an optimization to introduce only when measured contention justifies it.

## GitHub Issues

Issues are auxiliary human interaction for credentials, permissions, policy, or discussion-heavy decisions. Canonical state remains in JSON.

## Pull requests

PRs are delivery/review surfaces for deliverables that should not land directly. Store the PR reference in the Work Item execution receipt.

## GitHub Pages Panel

The root static Panel fetches the known state JSONs and governance Markdown directly from the same repository.

No rendering build or snapshot generation is required.

Configure GitHub Pages to deploy from the `main` branch repository root.

## Scheduler

Any external scheduler may invoke an Agent. The trigger identifies the repository + Manager Job or Worker role and tells the Agent to read `AGENTS.md`.

Detailed operating rules stay in the repository.
