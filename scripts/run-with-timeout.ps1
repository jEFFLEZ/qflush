<#
PowerShell wrapper: run a command with a timeout.
Usage:
  pwsh ./scripts/run-with-timeout.ps1 -Cmd "node dist/index.js start" -TimeoutSec 12
#>
param(
  [Parameter(Mandatory=$true)][string]$Cmd,
  [int]$TimeoutSec = 10
)

Write-Host "[run-with-timeout] starting command: $Cmd"
$process = Start-Process pwsh -ArgumentList "-NoProfile","-NoLogo","-Command",$Cmd -PassThru -WindowStyle Hidden

Start-Sleep -Seconds $TimeoutSec

if (-not $process.HasExited) {
  Write-Host "[run-with-timeout] timeout reached ($TimeoutSec s) -> attempting graceful stop (Ctrl+C equivalent)"
  try {
    $null = $process.CloseMainWindow()
  } catch {}
  Start-Sleep -Seconds 2
  if (-not $process.HasExited) {
    Write-Host "[run-with-timeout] still running -> forcing kill"
    try { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue } catch {}
  }
}

# return exit code if available
if ($process -and $process.HasExited) { exit $process.ExitCode } else { exit 0 }
