# cleanup-actions.ps1
# Cancel in-progress/queued workflow runs and close PRs from a feature branch
Param(
  [string]$Repo = 'jEFFLEZ/qflush',
  [string]$FeatureBranch = 'feat/tools-encoders'
)

if (-not $env:ACTIONS_TOKEN) {
  Write-Output 'NO_TOKEN'
  exit 2
}

$headers = @{ Authorization = 'Bearer ' + $env:ACTIONS_TOKEN; Accept = 'application/vnd.github+json'; 'User-Agent' = 'cleanup-script' }

try {
  Write-Output "Listing workflow runs for repo $Repo..."
  $url = "https://api.github.com/repos/$Repo/actions/runs?per_page=200"
  $resp = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -ErrorAction Stop
  $runs = $resp.workflow_runs
  $toCancel = $runs | Where-Object { $_.status -in @('in_progress','queued') }
  if ($toCancel.Count -eq 0) { Write-Output 'No in_progress/queued runs to cancel.' } else {
    foreach ($r in $toCancel) {
      Write-Output "Cancelling run id=$($r.id) name='$($r.name)' branch=$($r.head_branch)"
      Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/actions/runs/$($r.id)/cancel" -Method Post -Headers $headers -ErrorAction SilentlyContinue
    }
  }

  Write-Output "Checking PRs with head=$Repo.Split('/')[0]:$FeatureBranch..."
  $owner = $Repo.Split('/')[0]
  $prsUrl = "https://api.github.com/repos/$Repo/pulls?head=$owner`:$FeatureBranch"
  $prs = Invoke-RestMethod -Uri $prsUrl -Headers $headers -Method Get -ErrorAction Stop
  if ($prs.Count -eq 0) { Write-Output 'No PRs found for feature branch.' } else {
    foreach ($p in $prs) {
      Write-Output "Closing PR #$($p.number): $($p.title)"
      Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/pulls/$($p.number)" -Method Patch -Headers $headers -Body (@{ state='closed' } | ConvertTo-Json) -ErrorAction SilentlyContinue
      # optional: delete remote branch ref
      try {
        Write-Output "Deleting remote ref heads/$FeatureBranch"
        Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/git/refs/heads/$FeatureBranch" -Method Delete -Headers $headers -ErrorAction Stop
      } catch {
        Write-Output "Failed to delete remote ref (maybe already deleted): $($_.Exception.Message)"
      }
    }
  }

  Write-Output 'Done. Summary:'
  $remaining = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
  $remaining.workflow_runs | Where-Object { $_.status -in @('in_progress','queued') } | Select-Object id,name,status,head_branch | ConvertTo-Json -Depth 3

} catch {
  Write-Error "Error during cleanup: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    try { $txt = $_.Exception.Response.GetResponseStream() | New-Object System.IO.StreamReader | ForEach-Object { $_.ReadToEnd() }; Write-Output $txt } catch {}
  }
  exit 1
}
