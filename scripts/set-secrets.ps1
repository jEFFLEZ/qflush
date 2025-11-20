param(
  [string]$Repo = '',
  [switch]$PersistLocal
)

# PowerShell script to set secrets using gh CLI or write to .env.local
# If -PersistLocal is set, secrets are also stored encrypted under $env:USERPROFILE\.qflush\secrets.json
# Usage: .\scripts\set-secrets.ps1 -Repo 'owner/repo' -PersistLocal

if (-not $Repo) {
  try { $u = git remote get-url github 2>$null } catch { $u = $null }
  if (-not $u) { try { $u = git remote get-url origin 2>$null } catch { $u = $null } }
  if ($u) { $Repo = ($u -replace '.*?/([^/]+/[^/]+)(\.git)?$','$1') }
}
if (-not $Repo) { Write-Error 'Repo not provided and could not be detected. Provide -Repo owner/repo.'; exit 2 }

$secrets = @('NPM_TOKEN','GUMROAD_TOKEN','QFLUSH_TOKEN','REDIS_URL','COPILOT_HMAC_SECRET','WEBHOOK_URL','GUMROAD_TOKEN_FILE')

$gh = Get-Command gh -ErrorAction SilentlyContinue
if ($gh) { $useGh = $true } else { $useGh = $false }

# helper: persist encrypted secret locally
function Save-LocalSecret([string]$key, [string]$val) {
  try {
    $dir = Join-Path $env:USERPROFILE '.qflush'
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    $file = Join-Path $dir 'secrets.json'
    $enc = (ConvertTo-SecureString $val -AsPlainText -Force | ConvertFrom-SecureString)
    $obj = @{}
    if (Test-Path $file) {
      try { $obj = Get-Content $file -Raw | ConvertFrom-Json } catch { $obj = @{} }
    }
    $obj.$key = $enc
    $obj | ConvertTo-Json -Depth 5 | Set-Content -Path $file -Encoding UTF8
    Write-Output "Saved ${key} to ${file} (encrypted)"
  } catch {
    Write-Warning "Failed to save local secret ${key}: $_"
  }
}

foreach ($key in $secrets) {
  # dynamic env var read
  try { $val = [System.Environment]::GetEnvironmentVariable($key) } catch { $val = $null }
  if (-not $val) {
    $val = Read-Host "Provide value for ${key} (leave empty to skip)"
  }
  if (-not $val) { Write-Output "Skipping ${key}"; continue }
  if ($useGh) {
    try {
      gh secret set $key --body $val --repo $Repo
      Write-Output "Set ${key} as GitHub secret in ${Repo}"
    } catch {
      Write-Warning "gh secret set failed for ${key}: $_ - falling back to local file"
      # fallback to local
      if (-not (Test-Path '.env.local')) { New-Item -ItemType File -Path '.env.local' | Out-Null }
      # remove any existing line for the key
      (Get-Content .env.local) -replace "^${key}=.*$","" | Set-Content .env.local
      Add-Content .env.local "${key}=${val}"
    }
  } else {
    Write-Output "gh not available — writing ${key} to .env.local"
    if (-not (Test-Path .env.local)) { New-Item -ItemType File -Path .env.local | Out-Null }
    # remove any existing line for the key
    (Get-Content .env.local) -replace "^${key}=.*$","" | Set-Content .env.local
    Add-Content .env.local "${key}=${val}"
  }

  if ($PersistLocal) {
    Save-LocalSecret -key $key -val $val
  } else {
    # Ask user whether to persist locally
    $yn = Read-Host "Persist ${key} locally encrypted under %USERPROFILE%\\.qflush? (y/N)"
    if ($yn -and $yn.ToLower().StartsWith('y')) {
      Save-LocalSecret -key $key -val $val
    }
  }
}

Write-Output 'Done.'
