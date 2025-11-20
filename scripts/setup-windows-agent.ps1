<#
PowerShell helper to download and configure an Azure DevOps self-hosted agent on Windows.
Usage (run as Administrator PowerShell):
  PS> .\setup-windows-agent.ps1 -OrganizationUrl "https://dev.azure.com/funesterie" -Pool "self-hosted" -AgentName "qflush-agent"

You will be prompted for a PAT if not provided via -PatSecure.
#>
param(
  [string]$OrganizationUrl = "https://dev.azure.com/funesterie",
  [string]$Pool = "self-hosted",
  [string]$AgentName = "qflush-agent",
  [securestring]$PatSecure = $null,
  [string]$AgentPackageUrl = "https://vstsagentpackage.azureedge.net/agent/2.220.1/vsts-agent-win-x64-2.220.1.zip",
  [string]$InstallDir = "C:\azagent"
)

function To-UnsecureString([securestring] $s) {
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if (-not $PatSecure) {
  Write-Host "Enter a Personal Access Token (PAT) with 'Marketplace (publish)' and 'Agent Pools (read & manage)' scopes:" -ForegroundColor Yellow
  $PatSecure = Read-Host -AsSecureString "PAT"
}

$Pat = To-UnsecureString $PatSecure

if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir | Out-Null }
Push-Location $InstallDir

$zip = Join-Path $InstallDir "agent.zip"
Write-Host "Downloading agent package from $AgentPackageUrl ..."
Invoke-WebRequest -Uri $AgentPackageUrl -OutFile $zip -UseBasicParsing

Write-Host "Extracting package..."
Expand-Archive -Path $zip -DestinationPath $InstallDir -Force
Remove-Item $zip -Force

# Find the agent folder (the zip extracts into the current folder files)
$agentExe = Join-Path $InstallDir 'config.cmd'
if (-not (Test-Path $agentExe)) {
  Write-Host "Could not find config.cmd in $InstallDir. Listing files:" -ForegroundColor Red
  Get-ChildItem -Path $InstallDir -Recurse | Select-Object -First 50 | Format-List
  Pop-Location
  exit 1
}

Write-Host "Configuring agent (unattended)..."
$argList = "--unattended --url `"$OrganizationUrl`" --auth pat --token `"$Pat`" --pool `"$Pool`" --agent `"$AgentName`" --acceptTeeEula"
Write-Host ".\config.cmd $argList"

# Run config.cmd
& .\config.cmd --unattended --url $OrganizationUrl --auth pat --token $Pat --pool $Pool --agent $AgentName --acceptTeeEula

if ($LASTEXITCODE -ne 0) {
  Write-Host "Agent configuration failed (exit $LASTEXITCODE). Check output above." -ForegroundColor Red
  Pop-Location
  exit $LASTEXITCODE
}

Write-Host "Agent configured. Test run interactively with: .\run.cmd" -ForegroundColor Green
Write-Host "To install as a service (recommended), follow the Azure DevOps agent pool UI instructions or run the service install script from this folder (if provided)." -ForegroundColor Yellow

Pop-Location
Write-Host "Done. Agent should appear in Azure DevOps Agent Pools as online." -ForegroundColor Green
