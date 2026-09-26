# Example: private Issue snapshot workflow

This is an **optional pattern**, not the default public-repository setup.

Save as `.github/workflows/pages-private-snapshot.yml` only when you intentionally want a server-side Issue snapshot.

```yaml
name: Build private Issue snapshot

on:
  workflow_dispatch:
  schedule:
    - cron: "17 * * * *"

permissions:
  contents: read
  issues: read

jobs:
  snapshot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Export Issues
        env:
          GH_TOKEN: ${{ github.token }}
          REPO: ${{ github.repository }}
        run: |
          mkdir -p panel-data
          gh api --paginate "repos/$REPO/issues?state=all&per_page=100"             --jq '[.[] | select(.pull_request | not)]' > panel-data/issues.json

      # Choose your publication mechanism deliberately.
      # If the resulting Pages site is public, panel-data/issues.json is public too.
```

Then set `company/company.json`:

```json
{
  "panel": {
    "issueSource": "snapshot",
    "privateSnapshotPath": "panel-data/issues.json"
  }
}
```

Do not publish sensitive Issue data to a public Pages site.
