Azure DevOps Marketplace publish requires:

- `PUBLISHER_ID` (pipeline variable) — your publisher ID in Visual Studio Marketplace (the publisher name)
- `AZURE_DEVOPS_EXT_PAT` (pipeline variable/secret) — a Personal Access Token (scopes: "Marketplace (publish)" or full access for extension publishing)

To configure in Azure DevOps:
1. Go to your project -> Pipelines -> Library -> Variable groups or pipeline variables.
2. Add `PUBLISHER_ID` and `AZURE_DEVOPS_EXT_PAT` as pipeline variables or link secret variable group.

The pipeline `.azure-pipelines/workflows/azure-publish.yml` expects `extensions/vscode-npz/vss-extension.json` to exist and `tfx-cli` to create and publish the VSIX.
