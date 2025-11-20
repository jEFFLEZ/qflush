Azure DevOps Marketplace publish requires:

- `PUBLISHER_ID` (pipeline variable) — your publisher ID in Visual Studio Marketplace (the publisher name), e.g. `funesterie`.
- `AZURE_DEVOPS_EXT_PAT` (pipeline secret) — a Personal Access Token with Marketplace publish scope.
- `AGENT_POOL` (pipeline variable) — name of a self-hosted agent pool to use for the publish job. If not set, the job will fail when there is no hosted parallelism.

How to create a self-hosted agent pool and agent

1. In Azure DevOps project -> Project settings -> Pipelines -> Agent pools -> New agent pool. Name it e.g. `self-hosted`.
2. Click the pool -> New agent -> choose the OS of the machine where you'll run the agent (Linux/Windows).
3. Follow the provided instructions to download and configure the agent on your machine. Example for Linux:
   - mkdir myagent && cd myagent
   - curl -O https://vstsagentpackage.azureedge.net/agent/2.218.1/vsts-agent-linux-x64-2.218.1.tar.gz
   - tar zxvf vsts-agent-*.tar.gz
   - ./config.sh --unattended --url https://dev.azure.com/<your_org> --auth pat --token <YOUR_PAT> --pool self-hosted --agent qflush-agent
   - sudo ./svc.sh install && sudo ./svc.sh start
4. In the pipeline variables (Pipeline -> Edit -> Variables) add `AGENT_POOL=self-hosted` and mark `AZURE_DEVOPS_EXT_PAT` as secret.

Once the self-hosted agent is online, rerun the pipeline and the publish job will use the specified pool and avoid the hosted parallelism error.

The pipeline `.azure-pipelines/workflows/azure-publish.yml` expects `extensions/vscode-npz/vss-extension.json` to exist and `tfx-cli` to create and publish the VSIX.
