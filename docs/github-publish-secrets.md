GitHub Actions publish workflow requires these secrets in the repository settings:

- `VSCE_TOKEN` — Personal Access Token for Visual Studio Marketplace (used by `@vscode/vsce publish`) 
- `OPEN_VSX_TOKEN` — API token for Open VSX (optional)

To add secrets:
1. Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret.
2. Add `VSCE_TOKEN` and `OPEN_VSX_TOKEN` values.

Trigger the workflow manually under Actions → Publish VS Code extension → Run workflow or push a tag `v*` to automatically run.
