# Claim locks

Work Items are GitHub Issues.

Claim ownership is made atomic with one short-lived lock file per Issue:

```text
company/claims/issue-123.json
```

A Worker claims Issue #123 by creating that path with GitHub's **create file** operation.

Because the path must not already exist, only one concurrent claimant can win.

The lock file contains:

```json
{
  "schemaVersion": 1,
  "issueNumber": 123,
  "agentId": "worker-a",
  "runnerId": "chatgpt-scheduled-task",
  "claimedAt": "2026-09-27T00:00:00.000Z",
  "leaseExpiresAt": "2026-09-27T01:00:00.000Z",
  "workerMethodVersion": "v1"
}
```

Rules:

1. If the lock path does not exist, attempt to create it.
2. Create succeeds → claim won.
3. Create reports that the path already exists → claim lost; inspect the lock and choose another Issue.
4. Heartbeat by fetching the lock + current SHA and extending `leaseExpiresAt`.
5. If a lock is expired, a new Worker may delete it with its current SHA and then race to create a fresh lock.
6. Finish/problem transition updates the Issue first, then removes the lock. If cleanup fails, expiry provides recovery.

The lock file is a technical mutex only. The GitHub Issue remains the canonical Work Item.
