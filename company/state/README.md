# Operational state

Work Items and System Incidents are GitHub Issues.

Only state that does not naturally map to one Issue remains as repository JSON:

- `managers.json` — Manager leases and current Manager state
- `manager-runs.json` — Manager Run history

Worker claim mutexes are temporary files under:

```text
company/claims/issue-<number>.json
```

The Issue remains canonical. A claim file is only a technical lock.

## Manager-state writes

For `managers.json` and `manager-runs.json`:

1. fetch current file + blob SHA,
2. modify only the intended Manager/Run state,
3. increment `revision`,
4. update with the fetched SHA,
5. stale SHA → refetch and reapply only the intended mutation.

Never overwrite newer state from stale chat/local memory.
