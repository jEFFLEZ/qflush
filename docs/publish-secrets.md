This repository's release publish workflow requires the following GitHub secrets to be set in the repository settings:

- `NPM_TOKEN` — npm auth token for publishing the package (if publishing to npm)
- `VSCE_TOKEN` — Personal access token for Visual Studio Marketplace (optional, if using `vsce`)
- `OPENVSX_TOKEN` — token for publishing to Open VSX (optional)
- `AZURE_CREDENTIALS` — Azure service principal JSON if publishing to Azure DevOps (optional)

To set a secret:
1. Go to your GitHub repository -> Settings -> Secrets and variables -> Actions -> New repository secret.
2. Enter the secret name and value and save.

The provided workflow `.github/workflows/publish-on-release.yml` will run on GitHub `release` published events and will build and publish to npm. If you want marketplace or Open VSX publish, adapt the workflow to call `vsce` or `open-vsx-publisher` with the appropriate tokens.
