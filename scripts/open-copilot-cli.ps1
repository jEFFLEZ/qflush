# Open the official GitHub Copilot CLI repository in the default browser
# Usage: .\scripts\open-copilot-cli.ps1

$repoUrl = "https://github.com/github/copilot-cli"
try {
  Start-Process -FilePath $repoUrl -ErrorAction Stop | Out-Null
} catch {
  Write-Host "Open this URL in your browser: $repoUrl"
}
