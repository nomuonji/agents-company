# Private repository + GitHub Pages

## Can private repository Issues be read through the API?

Yes. Private repository Issues can be read through the GitHub API when the caller is authenticated and has sufficient Issue read permission.

The important constraint is the browser.

A static GitHub Pages application is client-side JavaScript. Embedding a personal access token, GitHub App private key, or other reusable credential in that JavaScript would expose it to visitors and must not be done.

## Do private repos require GitHub Actions for the Panel?

Not inherently.

The repository and the Pages site are separate concerns:

- GitHub Pages can be sourced from a private repository on supported paid plans.
- A Pages site is not automatically confidential merely because its source repository is private.
- Private Issue API data still requires authenticated access.

For a private company repository, choose one of these patterns.

### A. Authenticated backend

Panel → authenticated backend / GitHub App → private Issues API.

Best when you need live private state and access control.

### B. Server-side snapshot

GitHub Actions or another trusted server-side runner uses `GITHUB_TOKEN` to read private Issues and produces a sanitized static `issues.json` for the Panel.

This is simple, but the snapshot has the visibility of the published site. Never publish sensitive Issue content to a public Pages site.

### C. Enterprise private Pages

GitHub Enterprise Cloud organizations can publish certain project Pages sites privately.

This controls access to the site itself, but reusable GitHub API credentials still should not be embedded in browser JavaScript.

## Default template mode

The default template assumes a public repository:

```json
{
  "panel": {
    "issueSource": "github-api-public"
  }
}
```

For a private snapshot deployment, switch to:

```json
{
  "panel": {
    "issueSource": "snapshot",
    "privateSnapshotPath": "panel-data/issues.json"
  }
}
```

Then generate `panel-data/issues.json` in a trusted server-side workflow.
