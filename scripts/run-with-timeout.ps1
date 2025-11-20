<#
PowerShell wrapper: run a command with a timeout.
Usage:
  pwsh ./scripts/run-with-timeout.ps1 -Cmd "node dist/index.js start" -TimeoutSec 12
Options:
  -Quiet (default)  -> do not write to host
  -Noisy            -> enable console output
  -LogFile <path>   -> append logs to file
#>
param(
  [Parameter(Mandatory=$true)][string]$Cmd,
  [int]$TimeoutSec = 10,
  [switch]$Noisy,
  [string]$LogFile = ''
)

# By default be quiet to avoid spamming UIs (unless -Noisy provided)
$Quiet = -not $Noisy

function Log([string]$msg) {
  if ($LogFile -and $LogFile.Trim()) {
    try { Add-Content -Path $LogFile -Value ("$(Get-Date -Format o) ``: ``" + $msg) -Encoding UTF8 -ErrorAction SilentlyContinue } catch { }
  }
  if (-not $Quiet) { Write-Host $msg }
  else { Write-Verbose $msg }
}

Log "[run-with-timeout] starting command: $Cmd"
$process = Start-Process pwsh -ArgumentList "-NoProfile","-NoLogo","-Command",$Cmd -PassThru -WindowStyle Hidden

Start-Sleep -Seconds $TimeoutSec

if (-not $process.HasExited) {
    Log "[run-with-timeout] timeout reached ($TimeoutSec s) -> attempting graceful stop (Ctrl+C equivalent)"
    try {
        $null = $process.CloseMainWindow()
    } catch {}
    Start-Sleep -Seconds 1
    if (-not $process.HasExited) {
        Log "[run-with-timeout] still running -> forcing kill"
        try { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue } catch {}
    }
}

# return exit code if available
if ($process -and $process.HasExited) { exit $process.ExitCode } else { exit 0 }
