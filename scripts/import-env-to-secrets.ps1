<#
Import .env file and store secrets encrypted under %USERPROFILE%\.qflush\secrets.json using DPAPI (Windows)
Usage:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\import-env-to-secrets.ps1 -EnvPath "$env:USERPROFILE\Desktop\.env"

This script detects common secret variable names (NPM_TOKEN, GUMROAD_TOKEN, COPILOT_HMAC_SECRET, REDIS_URL, etc.) and stores only those values encrypted.
#>
param(
  [string]$EnvPath = "$env:USERPROFILE\Desktop\.env",
  [switch]$RestrictFileAcl
)

if (-not (Test-Path $EnvPath)) {
  Write-Error "Env file not found: $EnvPath"
  exit 2
}

# canonical secret keys we care about
$canonical = @{
  'NPM_TOKEN' = 'NPM_TOKEN'
  'GUMROAD_TOKEN' = 'GUMROAD_TOKEN'
  'QFLUSH_TOKEN' = 'QFLUSH_TOKEN'
  'REDIS_URL' = 'REDIS_URL'
  'COPILOT_HMAC_SECRET' = 'COPILOT_HMAC_SECRET'
  'COPILOT_WEBHOOK_URL' = 'WEBHOOK_URL'
  'COPILOT_BRIDGE_URL' = 'COPILOT_BRIDGE_URL'
  'GUMROAD_TOKEN_FILE' = 'GUMROAD_TOKEN_FILE'
}

function NormalizeKey([string]$k) {
  if (-not $k) { return $null }
  $u = $k.Trim().ToUpper()
  if ($canonical.ContainsKey($u)) { return $canonical[$u] }
  # common heuristics
  if ($u -match '(^|_)NPM(_|$|TOKEN)') { return 'NPM_TOKEN' }
  if ($u -match 'GUMROAD') { return 'GUMROAD_TOKEN' }
  if ($u -match 'COPILOT' -and $u -match 'HMAC|SECRET|KEY') { return 'COPILOT_HMAC_SECRET' }
  if ($u -match 'COPILOT' -and $u -match 'WEBHOOK') { return 'WEBHOOK_URL' }
  if ($u -match 'REDIS') { return 'REDIS_URL' }
  if ($u -match 'QFLUSH' -and $u -match 'TOKEN') { return 'QFLUSH_TOKEN' }
  # if the key contains TOKEN or SECRET, treat as secret
  if ($u -match 'TOKEN|SECRET|KEY|PASSWORD|PASS') { return $u }
  return $null
}

# read lines robustly
$all = Get-Content -Path $EnvPath -ErrorAction Stop
$map = @{}

foreach ($line in $all) {
  $trim = $line.Trim()
  if ([string]::IsNullOrWhiteSpace($trim)) { continue }
  if ($trim.StartsWith('#')) { continue }
  # support KEY=VALUE and export KEY=VALUE
  if ($trim -match '^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
    $key = $matches[1]
    $val = $matches[2]
    # strip optional surrounding quotes
    if ($val.Length -ge 2 -and (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'")))) {
      $val = $val.Substring(1, $val.Length-2)
    }
    $canon = NormalizeKey $key
    if (-not $canon) { continue } # skip non-secret vars
    # skip boolean flags and numeric ports
    if ($val -match '^(?:0|1|true|false)$' -or $val -match '^[0-9]+$') { continue }
    try {
      $secure = ConvertTo-SecureString $val -AsPlainText -Force
      $enc = $secure | ConvertFrom-SecureString
      $map[$canon] = $enc
      Write-Host "Queued secret: $canon"
    } catch {
      Write-Warning "Failed to encrypt $key: $_"
    }
  }
}

if ($map.Count -eq 0) {
  Write-Host 'No secrets detected in the .env file.'
  exit 0
}

$dir = Join-Path $env:USERPROFILE '.qflush'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$file = Join-Path $dir 'secrets.json'
try {
  $existing = @{
  }
  if (Test-Path $file) {
    try {
      $existing = Get-Content $file -Raw | ConvertFrom-Json -ErrorAction Stop
    } catch {
      $existing = @{
      }
    }
  }
  foreach ($k in $map.Keys) {
    $existing.$k = $map[$k]
  }
  $existing | ConvertTo-Json -Depth 5 | Set-Content -Path $file -Encoding UTF8
  Write-Host "Saved encrypted secrets to $file"
  if ($RestrictFileAcl) {
    try {
      icacls $file /inheritance:r /grant:r "$env:USERNAME:(R,W)" | Out-Null
      Write-Host "Restricted ACL on $file to user $env:USERNAME"
    } catch {
      Write-Warning "Failed to set ACL: $_"
    }
  }
} catch {
  Write-Error "Failed to write secrets file: $_"
  exit 3
}

Write-Host 'Done.'
