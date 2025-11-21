<#
Import .env file and store secrets encrypted under %USERPROFILE%\.qflush\secrets.json using DPAPI (Windows)
Usage:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\import-env-to-secrets.ps1 -EnvPath "$env:USERPROFILE\Desktop\.env" [-Quiet]

This script detects common secret variable names (NPM_TOKEN, GUMROAD_TOKEN, COPILOT_HMAC_SECRET, REDIS_URL, etc.) and stores only those values encrypted.
#>
param(
  [string]$EnvPath = "$env:USERPROFILE\Desktop\.env",
  [switch]$RestrictFileAcl,
  [switch]$Quiet
)

function Log([string]$msg) {
  if ($Quiet) { Write-Verbose $msg } else { Write-Host $msg }
}

# Normalize path and try common fallbacks when file not found
$EnvPath = [Environment]::ExpandEnvironmentVariables($EnvPath)
if (-not (Test-Path $EnvPath)) {
  Log "Env file not found at '$EnvPath' — attempting common fallbacks..."
  $candidates = @()
  # If user passed a directory, try <dir>\.env
  if (Test-Path (Split-Path $EnvPath -Parent)) {
    $candidates += Join-Path (Split-Path $EnvPath -Parent) '.env'
  }
  # If leaf looks like 'Desktop.env' they may have omitted the backslash -> convert to Desktop\.env
  $leaf = Split-Path $EnvPath -Leaf
  if ($leaf -ieq 'Desktop.env') {
    $parent = Split-Path $EnvPath -Parent
    $candidates += Join-Path $parent 'Desktop\.env'
    $candidates += Join-Path $parent 'Desktop' | ForEach-Object { Join-Path $_ '.env' }
  }
  # Try adding a backslash before the last component if missing
  $parent = Split-Path $EnvPath -Parent
  $addSlash = Join-Path $parent $leaf
  $candidates += $addSlash
  # Try interpreting EnvPath as a directory and append .env
  $candidates += Join-Path $EnvPath '.env'

  $found = $null
  foreach ($c in $candidates | Select-Object -Unique) {
    if (Test-Path $c) { $found = $c; break }
  }
  if ($found) {
    Log "Using fallback env file: $found"
    $EnvPath = $found
  } else {
    Write-Error "Env file not found: $EnvPath"
    exit 2
  }
}

# read and process file
try {
  $all = Get-Content -Path $EnvPath -ErrorAction Stop
} catch {
  Write-Error "Failed to read env file: $EnvPath"; exit 2
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
  'AZURE_PAT' = 'AZURE_PAT'
  'VS_PUBLISHER' = 'VS_PUBLISHER'
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
$map = @{}

# multiline value support: join continuation lines with backtick-space
$currentKey = $null
$currentVal = $null

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
    # if we were accumulating a value, this is a new key -> save the old one first
    if ($currentKey) {
      try {
        $secure = ConvertTo-SecureString $currentVal -AsPlainText -Force
        $enc = $secure | ConvertFrom-SecureString
        $map[$currentKey] = $enc
        Log "Queued secret: $currentKey"
      } catch {
        $err = ($_ | Out-String).Trim()
        if ($Quiet) { Write-Verbose ("Failed to encrypt {0}: {1}" -f $currentKey, $err) } else { Write-Warning ("Failed to encrypt {0}: {1}" -f $currentKey, $err) }
      }
    }
    # start new key
    $currentKey = $canon
    $currentVal = $val
  } elseif ($currentKey -and $trim -match '^[\s`]{1,}(.+)$') {
    # handle continuation line (indented or starting with ` )
    $cont = $matches[1]
    # strip optional surrounding quotes
    if ($cont.Length -ge 2 -and (($cont.StartsWith('"') -and $cont.EndsWith('"')) -or ($cont.StartsWith("'") -and $cont.EndsWith("'")))) {
      $cont = $cont.Substring(1, $cont.Length-2)
    }
    $currentVal += "`n$cont"
  }
}

# take care to add the final value
if ($currentKey) {
  try {
    $secure = ConvertTo-SecureString $currentVal -AsPlainText -Force
    $enc = $secure | ConvertFrom-SecureString
    $map[$currentKey] = $enc
    Log "Queued secret: $currentKey"
  } catch {
    $err = ($_ | Out-String).Trim()
    if ($Quiet) { Write-Verbose ("Failed to encrypt {0}: {1}" -f $currentKey, $err) } else { Write-Warning ("Failed to encrypt {0}: {1}" -f $currentKey, $err) }
  }
}

# After building $map, ensure no artificial limit and report count
if ($map.Count -eq 0) {
  Log 'No secrets detected in the .env file.'
  exit 0
}

# report what will be saved
Log "Preparing to save $($map.Count) secret(s): $((($map.Keys) -join ', '))"

$dir = Join-Path $env:USERPROFILE '.qflush'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$file = Join-Path $dir 'secrets.json'
try {
  $existing = @{}
  if (Test-Path $file) {
    try {
      $raw = Get-Content $file -Raw -ErrorAction Stop
      $parsed = $raw | ConvertFrom-Json -ErrorAction Stop
      if ($parsed -ne $null) {
        foreach ($p in $parsed.PSObject.Properties) { $existing[$p.Name] = $p.Value }
      }
    } catch {
      $existing = @{
      }
    }
  }

  foreach ($k in $map.Keys) { $existing[$k] = $map[$k] }

  $outObj = [ordered]@{
  }
  foreach ($name in $existing.Keys) { $outObj[$name] = $existing[$name] }

  # use sufficient depth and do not shorten output
  $json = $outObj | ConvertTo-Json -Depth 20 -Compress:$false
  Set-Content -Path $file -Value $json -Encoding UTF8
  Log "Saved encrypted secrets to $file (total $(($outObj.Keys).Count) entries)"
  if ($RestrictFileAcl) {
    try {
      icacls $file /inheritance:r /grant:r "$env:USERNAME:(R,W)" | Out-Null
      Log "Restricted ACL on $file to user $env:USERNAME"
    } catch {
      if ($Quiet) { Write-Verbose ("Failed to set ACL: {0}" -f $_) } else { Write-Warning ("Failed to set ACL: {0}" -f $_) }
    }
  }
} catch {
  if ($Quiet) { Write-Verbose ("Failed to write secrets file: {0}" -f $_) } else { Write-Error ("Failed to write secrets file: {0}" -f $_) }
  exit 3
}

Log 'Done.'
