param([string[]]$Args)
# Lightweight PowerShell launcher to run the qflash NPZ daemon without npm
$here = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location (Join-Path $here '..')
$node = $env:NODEJS_PATH -or 'node'
$exe = Get-Command $node -ErrorAction SilentlyContinue
if (-not $exe) {
  Write-Error "node executable not found. Update PATH or set NODEJS_PATH env var to the node binary."
  exit 1
}

# helper to run command in cwd
function Run-InCwd([string]$cwd, [string[]]$cmd) {
  Push-Location $cwd
  try { & $cmd } finally { Pop-Location }
}

if ($Args.Count -gt 0 -and $Args[0] -eq 'run' -and $Args[1] -eq 'qflash') {
  $cli = Join-Path (Get-Location) 'dist/cli.js'
  if (Test-Path $cli) {
    & $node $cli 'run' 'qflash' @($Args[2..($Args.Count-1)])
    exit $LASTEXITCODE
  } else {
    $script = Join-Path (Get-Location) 'dist/daemon/qflashd.js'
    & $node $script @($Args[2..($Args.Count-1)])
    exit $LASTEXITCODE
  }
}

# proxy commands: ci, install, build, test, package
$cmd = $Args[0]
if ($cmd -in @('ci','install','build','test','package')) {
  $target = Get-Location
  $remaining = $Args[1..($Args.Count-1)]
  for ($i=0;$i -lt $remaining.Count; $i++) {
    if ($remaining[$i] -like '--cwd*') {
      if ($remaining[$i] -like '--cwd=*') { $target = $remaining[$i].Split('=')[1] } else { $target = $remaining[$i+1]; $i++ }
    }
  }
  switch ($cmd) {
    'ci' { Run-InCwd $target @('npm','ci') }
    'install' { Run-InCwd $target @('npm','install','--no-audit','--no-fund') }
    'build' { Run-InCwd $target @('npm','run','build') }
    'test' { Run-InCwd $target @('npm','test') }
    'package' { Run-InCwd $target @('npm','run','package') }
  }
  exit $LASTEXITCODE
}

# default: run daemon
$script = Join-Path (Get-Location) 'dist/daemon/qflashd.js'
if (-not (Test-Path $script)) { Write-Error "Daemon script not found: $script"; exit 2 }
& $node $script @Args
