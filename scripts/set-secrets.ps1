param(
  [string]$Repo = ''
)

# PowerShell script to set secrets using gh CLI or write to .env.local
# Usage: .\scripts\set-secrets.ps1 -Repo 'owner/repo'

if (-not $Repo) {
  try { $u = git remote get-url github 2>$null } catch { $u = $null }
  if (-not $u) { try { $u = git remote get-url origin 2>$null } catch { $u = $null } }
  if ($u) { $Repo = ($u -replace '.*?/([^/]+/[^/]+)(\.git)?$','$1') }
}
if (-not $Repo) { Write-Error 'Repo not provided and could not be detected. Provide -Repo owner/repo.'; exit 2 }

$secrets = @('NPM_TOKEN','GUMROAD_TOKEN','QFLUSH_TOKEN','REDIS_URL','COPILOT_HMAC_SECRET','WEBHOOK_URL','GUMROAD_TOKEN_FILE')

$gh = Get-Command gh -ErrorAction SilentlyContinue
if ($gh) { $useGh = $true } else { $useGh = $false }

foreach ($key in $secrets) {
  $val = $env:$key
  if (-not $val) {
    $val = Read-Host "Provide value for $key (leave empty to skip)"
  }
  if (-not $val) { Write-Output "Skipping $key"; continue }
  if ($useGh) {
    gh secret set $key --body $val --repo $Repo
    Write-Output "Set $key as GitHub secret in $Repo"
  } else {
    Write-Output "gh not available — writing $key to .env.local"
    if (-not (Test-Path .env.local)) { New-Item -ItemType File -Path .env.local | Out-Null }
    (Get-Content .env.local) -replace "^$key=.*$","" | Set-Content .env.local
    Add-Content .env.local "$key=$val"
  }
}

Write-Output 'Done.'
