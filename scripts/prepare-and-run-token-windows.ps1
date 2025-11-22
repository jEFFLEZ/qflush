<#
PowerShell helper to convert a private key to unencrypted PEM, upload it to GitHub Actions secrets
and run the `get-installation-token.yml` workflow, then download the artifact.

Usage (PowerShell):
  .\scripts\prepare-and-run-token-windows.ps1 -KeyPath 'D:\keys\private.pem' -AppId 2326697 -InstallationId 95833021 -Repo 'jEFFLEZ/qflush'

Requirements:
 - gh CLI authenticated (gh auth login)
 - ssh-keygen / openssl available in PATH (Git for Windows provides ssh-keygen)
 - The script will fail if the private key is encrypted and cannot be converted without the passphrase.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)] [string] $KeyPath,
  [Parameter(Mandatory=$true)] [string] $AppId,
  [Parameter(Mandatory=$true)] [string] $InstallationId,
  [Parameter(Mandatory=$false)] [string] $Repo = 'jEFFLEZ/qflush',
  [switch] $DryRun
)

function Write-ErrAndExit($msg){ Write-Error $msg; exit 1 }

if (-not (Test-Path $KeyPath)) { Write-ErrAndExit "Key file not found: $KeyPath" }

$work = Join-Path -Path (Get-Location) -ChildPath "tmp-pem"
if (Test-Path $work) { Remove-Item -Recurse -Force $work }
New-Item -ItemType Directory -Path $work | Out-Null

$dest = Join-Path $work 'private-unencrypted.pem'
Copy-Item -Path $KeyPath -Destination $dest -Force

# Detect header
$head = ((Get-Content -Raw $dest) -split "\r?\n" | Select-Object -First 2) -join "`n"
Write-Host "Key header: $head"

# If OPENSSH header, try conversion using ssh-keygen
if ($head -match 'BEGIN OPENSSH PRIVATE KEY') {
  Write-Host "Converting OpenSSH key to PEM via ssh-keygen..."
  $conv = & ssh-keygen -p -f $dest -m PEM -N "" 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host $conv
    Write-ErrAndExit "ssh-keygen conversion failed or key is encrypted. Convert locally with passphrase or produce an unencrypted PEM."
  }
}

# Check for ENCRYPTED marker
$contents = Get-Content -Raw $dest
if ($contents -match 'ENCRYPTED' -or $contents -match 'Proc-Type: 4,ENCRYPTED') {
  Write-ErrAndExit "Private key appears encrypted. You must supply an unencrypted PEM. Use openssl/ssh-keygen locally to decrypt."
}

# Validate PEM header
if (-not ($contents -match '-----BEGIN (RSA |)PRIVATE KEY-----')) {
  Write-ErrAndExit "Resulting key does not appear to be a PEM private key. Inspect $dest"
}

if ($DryRun) { Write-Host "Dry run: prepared key is at $dest"; exit 0 }

# Set secrets via gh
Write-Host "Setting repository secrets (APP_ID, INSTALLATION_ID, PRIVATE_KEY_PEM) for $Repo"
$pk = Get-Content -Raw $dest
# Use gh secret set
gh secret set APP_ID --body $AppId --repo $Repo
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit "Failed to set APP_ID secret" }
gh secret set INSTALLATION_ID --body $InstallationId --repo $Repo
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit "Failed to set INSTALLATION_ID secret" }
# PRIVATE_KEY_PEM: ensure newlines preserved
# Use temporary file approach
$tempFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempFile -Value $pk -NoNewline
gh secret set PRIVATE_KEY_PEM --body (Get-Content -Raw $tempFile) --repo $Repo
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit "Failed to set PRIVATE_KEY_PEM secret" }
Remove-Item $tempFile -Force

Write-Host "Secrets set. Triggering workflow..."
$run = gh workflow run get-installation-token.yml --repo $Repo
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit "Failed to trigger workflow" }

# List latest runs and pick one for the workflow
Start-Sleep -Seconds 3
# get most recent run id (databaseId)
$runId = gh run list --workflow="get-installation-token.yml" --repo $Repo --limit 1 --json databaseId --jq '.[0].databaseId' 2>$null
if (-not $runId) { Write-ErrAndExit "Failed to get run id" }
Write-Host "Triggered run id: $runId"

# Poll run status until completed or timeout
$timeoutMinutes = 5
$waitSeconds = 5
$elapsed = 0
$maxSeconds = $timeoutMinutes * 60
while ($elapsed -lt $maxSeconds) {
  $status = gh run view $runId --repo $Repo --json status,conclusion --jq '.status' 2>$null
  if ($status -eq 'completed') { break }
  Start-Sleep -Seconds $waitSeconds
  $elapsed += $waitSeconds
}

$status = gh run view $runId --repo $Repo --json status,conclusion --jq '.status' 2>$null
$conclusion = gh run view $runId --repo $Repo --json status,conclusion --jq '.conclusion' 2>$null
Write-Host "Run status: $status conclusion: $conclusion"

if ($status -ne 'completed') { Write-ErrAndExit "Run did not complete in time (timeout $timeoutMinutes minutes)" }
if ($conclusion -ne 'success') { Write-ErrAndExit "Run completed but not successful: $conclusion" }

# Download artifact to D:\keys
$destDir = 'D:\keys'
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }
Write-Host "Downloading artifact installation-token to $destDir"
# remove existing extracted folder to avoid zip extraction conflicts
$extractedDir = Join-Path $destDir 'installation-token'
if (Test-Path $extractedDir) {
  Write-Host "Removing existing artifact extraction folder $extractedDir"
  Remove-Item -Recurse -Force $extractedDir
}
# remove existing root token file to avoid gh extraction error
$rootTokenPath = Join-Path $destDir 'token.txt'
if (Test-Path $rootTokenPath) {
  Write-Host "Removing existing token file $rootTokenPath to allow artifact extraction"
  Remove-Item -Force $rootTokenPath
}

gh run download $runId --repo $Repo --name installation-token --dir $destDir
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit "Failed to download artifact" }

# artifact may be extracted into $destDir\installation-token\token.txt or token may already exist at $destDir\token.txt
$artifactTokenPath = Join-Path $extractedDir 'token.txt'
$rootTokenPath = Join-Path $destDir 'token.txt'
if (Test-Path $artifactTokenPath) {
  Copy-Item -Path $artifactTokenPath -Destination $rootTokenPath -Force
  Write-Host "Token saved to $rootTokenPath"
} elseif (Test-Path $rootTokenPath) {
  Write-Host "Token already present at $rootTokenPath"
} else {
  Write-ErrAndExit "Token file not found at $artifactTokenPath or $rootTokenPath"
}

# also copy installation-repos.json to D:\keys if present (either in extractedDir or root)
$artifactReposPath = Join-Path $extractedDir 'installation-repos.json'
$rootReposPath = Join-Path $destDir 'installation-repos.json'
if (Test-Path $artifactReposPath) {
  Copy-Item -Path $artifactReposPath -Destination $rootReposPath -Force
  Write-Host "API result saved to $rootReposPath"
} elseif (Test-Path $rootReposPath) {
  Write-Host "API result already present at $rootReposPath"
} else {
  Write-Host "installation-repos.json not found in artifact."
}

Write-Host "Done."
