<#
store-secret.ps1
Securely read a token from terminal and store it as a GitHub Actions repository secret using gh CLI.
Requirements:
 - GitHub CLI (`gh`) installed and authenticated (run `gh auth login` first)
 - You must have admin permissions on the target repository
Usage:
  PowerShell> .\scripts\store-secret.ps1 -Repo "owner/repo" -Name "ACTIONS_TOKEN"

This script reads the token securely (no echo), writes to a tempfile, calls `gh secret set` with the file
and removes the tempfile immediately.
#>
param(
  [Parameter(Mandatory=$true)]
  [string]$Repo,
  [Parameter(Mandatory=$true)]
  [string]$Name
)

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error "gh CLI not found. Install and authenticate with 'gh auth login' before running this script."
  exit 2
}

try {
  $secure = Read-Host -AsSecureString -Prompt "Paste secret value (input hidden)"
  $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
  $tmp = Join-Path -Path $env:TEMP -ChildPath ([System.Guid]::NewGuid().ToString() + '.secret')
  Set-Content -Path $tmp -Value $plain -NoNewline -Force
  # Use gh to set the secret from file
  $cmd = "gh secret set $Name --repo $Repo --body-file $tmp"
  Write-Host "Setting secret '$Name' in repo '$Repo'..."
  $res = & gh secret set $Name --repo $Repo --body-file $tmp 2>&1
  Write-Host $res
} finally {
  if (Test-Path $tmp) { Remove-Item -Force $tmp }
  if ($null -ne $plain) { $plain = $null }
}

Write-Host "Done. Secret stored (or an error was printed above)."