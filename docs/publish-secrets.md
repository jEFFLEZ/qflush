This repository's release publish workflow requires the following GitHub secrets to be set in the repository settings:

- `NPM_TOKEN` — npm auth token for publishing the package (if publishing to npm)
- `VSCE_TOKEN` — Personal access token for Visual Studio Marketplace (optional, if using `vsce`)
- `OPENVSX_TOKEN` — token for publishing to Open VSX (optional)
- `AZURE_CREDENTIALS` — Azure service principal JSON if publishing to Azure DevOps (optional)
- `AZURE_PAT` — Personal Access Token for Visual Studio Marketplace (used by `VSIXPublisher.exe` on Windows runners)
- `VS_PUBLISHER` — The publisher name (GUID/account) for the extension in the Marketplace
- `VSIX_EXTENSION_ID` — The extension identifier for the VSIX

To set a secret:
1. Go to your GitHub repository -> Settings -> Secrets and variables -> Actions -> New repository secret.
2. Enter the secret name and value and save.

The provided workflow `.github/workflows/publish-vsix.yml` will run on tag pushes and will build the VSIX, upload it to a GitHub release, and attempt to publish to the Visual Studio Marketplace using `VSIXPublisher.exe` if `AZURE_PAT`, `VS_PUBLISHER`, and `VSIX_EXTENSION_ID` are configured. On Linux runners the repository already contains workflows that use `vsce` (`publish-vs-marketplace.yml`) for the VS Code extension publishing path.
