Open VSX publish setup

1. In the Open VSX website sign the Publisher Agreement and create a Personal Access Token.
2. In your GitHub repository go to Settings → Secrets → Actions and add a new secret named `OPEN_VSX_TOKEN` with the token value.
3. Tag a release (e.g. `v3.0.1`) or push a tag matching `v*` to trigger the workflow.

Notes:
- The workflow will build the extension and attempt to publish using `npx ovsx publish`.
- If publishing fails, the package `.vsix` remains available in the workflow artifacts (you can modify the workflow to upload artifacts).
