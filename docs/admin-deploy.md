Admin deployment steps for setting up a self-hosted agent and publishing the VS Code extension.

Prerequisites:
- Windows machine with admin rights and PowerShell (run as Administrator).
- Personal Access Token (PAT) with Marketplace publish and Agent Pools permissions.

Steps (copy/paste in an Administrator PowerShell):

# 1) Configure execution policy for the session
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned

# 2) Create agent directory and download agent package (replace URL if newer)
$installDir = 'C:\azagent'
New-Item -ItemType Directory -Force -Path $installDir
cd $installDir
$agentUrl = 'https://vstsagentpackage.azureedge.net/agent/2.220.1/vsts-agent-win-x64-2.220.1.zip'
Invoke-WebRequest -Uri $agentUrl -OutFile agent.zip
Expand-Archive agent.zip -DestinationPath . -Force
Remove-Item agent.zip -Force

# 3) Configure the agent (replace <PAT> and pool name)
$pat = Read-Host -AsSecureString "Enter PAT (will not echo)"
$plain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pat))
.\config.cmd --unattended --url "https://dev.azure.com/funesterie" --auth pat --token $plain --pool "self-hosted" --agent "qflush-agent" --acceptTeeEula

# 4) Install as a service
.\svc.sh install
.\svc.sh start

# 5) Verify agent online in Azure DevOps
# Go to Project settings -> Pipelines -> Agent pools -> self-hosted

# 6) Package and publish the VSIX (optional manual publish)
cd 'D:\qflush\extensions\vscode-npz'
npm install --no-audit --no-fund
npm run build
npx @vscode/vsce package
# publish (runs locally, PAT prompted)
$npat = Read-Host -AsSecureString "Enter PAT for publish"
$plainPublish = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($npat))
npx tfx extension publish --manifest-globs vss-extension.json --publisher funesterie --token $plainPublish --service-url https://marketplace.visualstudio.com/

Notes:
- Keep your PAT secret. Do not paste it in chats.
- If you prefer CI publishing, ensure repository secrets `AZURE_PAT` or `VSCE_TOKEN` are set in GitHub.
