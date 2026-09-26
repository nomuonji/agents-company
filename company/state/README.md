# Operational state

This directory is the machine-readable live state of the company.

The initial/simple model uses a small set of **known aggregate JSON files**:

- `work-items.json` — all Work Items
- `incidents.json` — all System Incidents
- `managers.json` — Manager leases + current Manager state
- `manager-runs.json` — Manager Run history

Each file has a top-level `revision` for human/debug visibility, but GitHub's blob SHA is the actual optimistic concurrency token.

## Write rule

1. Fetch the latest file and retain its SHA.
2. Modify only the intended entity.
3. Increment `revision`.
4. Update the file with that SHA.
5. On stale-SHA conflict, refetch and reapply only the intended change.

Never overwrite a newer aggregate file wholesale from stale local/chat state.

## Why aggregate JSON first?

It keeps:

- GitHub MCP access simple,
- GitHub Pages Panel fully static,
- file discovery unnecessary,
- the template easy to understand.

If measured Agent concurrency later makes retries noisy, state can be sharded by Manager or Work Item as a future optimization.
