# Work Item Issue body

Use this body when an Agent creates a Work Item Issue.

```markdown
<!-- agents-company:meta
{
  "schemaVersion": 1,
  "kind": "work",
  "status": "ready",
  "priority": "medium",
  "managerJobId": "general-manager",
  "workerMethod": { "id": "general-worker", "version": "active" },
  "workerMethodVersion": null,
  "dedupeKey": null,
  "execution": {
    "requiredTools": ["github"],
    "requiredCapabilities": ["repo_read", "repo_write"],
    "validationStrategy": {
      "type": "explicit",
      "checks": []
    },
    "deliveryMode": "direct_commit"
  },
  "claim": null,
  "executionReceipt": null,
  "finishedAt": null
}
-->

## Objective

Describe the concrete outcome.

## Acceptance criteria

- Criterion 1

## Instructions

Add task-specific instructions.

## Notes

Optional human-readable context.
```

Recommended title:

```text
[Work] Concrete task title
```
