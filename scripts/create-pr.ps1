Param(
  [string]$HeadBranch = 'feat/tools-encoders',
  [string]$BaseBranch = 'main',
  [string]$Title = 'feat(tools): add encoders and css encoder/decoder',
  [string]$Body = 'Add tools: tools/rgba_brotli_oc8.py, tools/css_encode.js, tools/css_decode.js.'
)

if (-not $env:ACTIONS_TOKEN) {
  Write-Error 'ACTIONS_TOKEN environment variable not set.'
  exit 2
}

$token = $env:ACTIONS_TOKEN
$payload = @{ title = $Title; head = $HeadBranch; base = $BaseBranch; body = $Body } | ConvertTo-Json -Depth 6

$headers = @{ Authorization = "Bearer $token"; Accept = 'application/vnd.github+json'; 'User-Agent' = 'qflush-bot' }

try {
  $resp = Invoke-RestMethod -Uri 'https://api.github.com/repos/jEFFLEZ/qflush/pulls' -Method Post -Headers $headers -Body $payload -ContentType 'application/json' -ErrorAction Stop
  Write-Output "PR created: $($resp.html_url)"
} catch {
  Write-Error "Failed to create PR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    try { $text = $_.Exception.Response.GetResponseStream() | New-Object System.IO.StreamReader | ForEach-Object { $_.ReadToEnd() }; Write-Output $text } catch {}
  }
  exit 1
}
