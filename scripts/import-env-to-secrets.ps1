<#
Import .env file and store secrets encrypted under %USERPROFILE%\.qflush\secrets.json using DPAPI (Windows)
Usage:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\import-env-to-secrets.ps1 -EnvPath "$env:USERPROFILE\Desktop\.env"

This script does NOT publish to GitHub; it only stores encrypted values locally tied to your Windows user account.
#>
param(
  [string]$EnvPath = "$env:USERPROFILE\Desktop\.env",
  [switch]$RestrictFileAcl
)

if (-not (Test-Path $EnvPath)) {
  Write-Error "Env file not found: $EnvPath"
  exit 2
}

try {
  $lines = Get-Content -Raw -Path $EnvPath -ErrorAction Stop | Select-String -Pattern '^[^#;]\w' -AllMatches | ForEach-Object { $_.Line }
} catch {
  # fallback: naive read and filter
  $lines = Get-Content -Path $EnvPath -ErrorAction Stop | Where-Object { $_ -and -not ($_.Trim().StartsWith('#')) }
}

$map = @{}

foreach ($line in $lines) {
  $trim = $line.Trim()
  if ([string]::IsNullOrWhiteSpace($trim)) { continue }
  if ($trim.StartsWith('#')) { continue }
  if ($trim -notmatch '=') { continue }
  $parts = $trim -split '=',2
  $key = $parts[0].Trim()
  $val = $parts[1]
  if (-not $key) { continue }
  # remove surrounding quotes if present
  if ($val.Length -ge 2 -and (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'")))) {
    $val = $val.Substring(1, $val.Length-2)
  }
  try {
    $secure = ConvertTo-SecureString $val -AsPlainText -Force
    $enc = $secure | ConvertFrom-SecureString
    $map[$key] = $enc
    Write-Host "Processed secret: $key"
  } catch {
    Write-Warning "Failed to encrypt $key: $_"
  }
}

$dir = Join-Path $env:USERPROFILE '.qflush'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$file = Join-Path $dir 'secrets.json'
try {
  $existing = @{}
  if (Test-Path $file) {
    try { $existing = Get-Content $file -Raw | ConvertFrom-Json -ErrorAction Stop } catch { $existing = @{} }
  }
  foreach ($k in $map.Keys) { $existing.$k = $map[$k] }
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
