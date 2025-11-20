# Cleanup script to replace remaining `qflush` references with `qflush`
# Usage: run from repo root: powershell -ExecutionPolicy Bypass -File .\scripts\cleanup-qflush.ps1
$ErrorActionPreference = 'Stop'

Write-Output "Running cleanup-qflush.ps1"
$root = Get-Location
Write-Output "Repo root: $root"

# Files/dirs to ignore (substring match) and file patterns
$ignoreDirs = @('.git','node_modules','.venv','.vscode','dist','out','release','.release')
$ignoreExts = @('\.log$','\.tgz$','\.zip$','\.vsix$','\.png$','\.jpg$','\.jpeg$','\.gif$','\.bin$','\.exe$')
$ignorePattern = (($ignoreDirs | ForEach-Object { [regex]::Escape($_) }) + $ignoreExts) -join '|'

# Collect files (exclude ignored dirs and file patterns)
Write-Output "Scanning files..."
$files = Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch $ignorePattern }
$changed = 0
$renamed = 0

foreach ($f in $files) {
    try {
        $text = Get-Content -Raw -LiteralPath $f.FullName -ErrorAction Stop
    } catch {
        # cannot read file as text (binary or locked), skip
        continue
    }
    if ($null -eq $text -or $text -eq '') { continue }
    try {
        # case-insensitive replacement
        $new = [regex]::Replace($text, 'qflush', 'qflush', 'IgnoreCase')
    } catch {
        # regex failed for this content, skip
        continue
    }
    if ($new -ne $text) {
        try { Set-Content -LiteralPath $f.FullName -Value $new -Encoding UTF8 -ErrorAction Stop } catch { Write-Output "Failed to write file: $($f.FullName) : $_"; continue }
        Write-Output "Patched: $($f.FullName)"
        $changed++
    }
}

# rename files/dirs containing qflush (case-insensitive)
Write-Output "Renaming files/dirs containing 'qflush' in name..."
$items = Get-ChildItem -Path $root -Recurse -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '(?i)qflush' -and ($_.FullName -notmatch $ignorePattern) } | Sort-Object -Property FullName -Descending
foreach ($it in $items) {
    $old = $it.FullName
    $parent = Split-Path $old -Parent
    $newName = $it.Name -replace '(?i)qflush','qflush'
    $newPath = Join-Path $parent $newName
    if ($old -ieq $newPath) { continue }
    try {
        Rename-Item -LiteralPath $old -NewName $newName -ErrorAction Stop
        Write-Output "Renamed: $old -> $newPath"
        $renamed++
    } catch {
        Write-Output "Failed to rename: $old -> $newPath : $_"
    }
}

if ($changed -gt 0 -or $renamed -gt 0) {
    Write-Output "Staging changes and committing..."
    try {
        git add -A
        git commit -m "chore(repo): replace qflush -> qflush and normalize names"
    } catch {
        Write-Output "git commit returned non-zero or nothing to commit: $_"
    }
    # push if upstream configured
    try {
        git rev-parse --abbrev-ref --symbolic-full-name '@{u}' > $null 2>&1
        try { git push } catch { Write-Output 'git push failed, please push manually.' }
    } catch {
        Write-Output 'No upstream configured for current branch; please push manually.'
    }
}

Write-Output "Done. Files patched: $changed, renamed: $renamed"

