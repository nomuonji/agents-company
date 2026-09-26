# Operational state

This directory is the machine-readable live state of the company.

- `manager-leases/` — one pre-created lease file per Manager Job; current-SHA update provides atomic Manager claim
- `manager-runs/` — immutable-ish history of each management cycle
- `work-items/` — executable queue; one file per Work Item
- `incidents/` — structural failure records

Do not create a single combined queue file. Entity-per-file storage is intentional for concurrent GitHub-MCP actors.

Operational state transitions normally commit directly to the default branch. Deliverables may use PRs separately.
