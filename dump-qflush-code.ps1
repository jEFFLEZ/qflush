$OutFile = Join-Path (Get-Location) 'qflush-code-dump.txt'

# Overwrite if exists
if (Test-Path $OutFile) {
    Remove-Item $OutFile -Force
}

# Extensions to include (lowercase)
$includeExts = @('.ts', '.tsx', '.js', '.cjs', '.mjs', '.json', '.yml', '.yaml', '.md', '.ps1')

# Directory name segments to exclude
$excludeDirs = @('node_modules','dist','out','.git','.vscode','coverage')

# Special exclude path fragments
$excludePathFragments = @('\.qflush\\cache','/.qflush/cache')

# Separator lines
$sep = '=' * 28

# Helper: check if path contains any excluded directory segment
function IsPathExcluded($fullPath) {
    $norm = $fullPath -replace '/', '\\'  # normalize to backslashes
    # quick fragment check
    foreach ($frag in $excludePathFragments) {
        $fragNorm = $frag -replace '/', '\\'
        if ($norm -like "*$fragNorm*") { return $true }
    }
    # split into segments and check
    $segments = $norm -split '\\+' | Where-Object { $_ -ne '' }
    foreach ($seg in $segments) {
        foreach ($d in $excludeDirs) {
            if ($seg -ieq $d) { return $true }
        }
    }
    return $false
}

# Collect files
$allFiles = Get-ChildItem -Recurse -File -Force -ErrorAction SilentlyContinue | Where-Object {
    try {
        # Compatible with Windows PowerShell (no '??' operator)
        $ext = [IO.Path]::GetExtension($_.FullName)
        if ($null -eq $ext) { $ext = '' }
        $ext = $ext.ToLower()
        if ($ext -eq '') { return $false }
        if ($ext -eq '.log') { return $false }
        if (-not ($includeExts -contains $ext)) { return $false }
        if (IsPathExcluded($_.FullName)) { return $false }
        return $true
    } catch {
        return $false
    }
}

# Sort for deterministic order
$files = $allFiles | Sort-Object FullName

# Write header
"qflush code dump generated: $(Get-Date -Format o)" | Out-File -FilePath $OutFile -Encoding utf8
"" | Out-File -FilePath $OutFile -Encoding utf8 -Append

$cwd = (Get-Location).ProviderPath

foreach ($f in $files) {
    try {
        # compute relative path
        $full = $f.FullName
        if ($full.StartsWith($cwd, [System.StringComparison]::InvariantCultureIgnoreCase)) {
            $rel = $full.Substring($cwd.Length)
            # strip leading slashes/backslashes robustly
            $rel = $rel -replace '^[\\/]+',''
        } else {
            $rel = $full
        }

        # write separators and file header
        $header1 = $sep
        $header2 = "FILE: $rel"
        $header3 = $sep
        $header4 = $sep
        $header1 | Out-File -FilePath $OutFile -Encoding utf8 -Append
        $header2 | Out-File -FilePath $OutFile -Encoding utf8 -Append
        $header3 | Out-File -FilePath $OutFile -Encoding utf8 -Append
        $header4 | Out-File -FilePath $OutFile -Encoding utf8 -Append

        # read file content (try utf8 then fallback)
        $content = $null
        try {
            $content = Get-Content -Raw -Encoding utf8 -ErrorAction Stop -LiteralPath $full
        } catch {
            try {
                $content = Get-Content -Raw -Encoding Default -ErrorAction Stop -LiteralPath $full
            } catch {
                $content = Get-Content -Raw -ErrorAction SilentlyContinue -LiteralPath $full
            }
        }

        if ($null -eq $content) { $content = "" }

        # write raw content
        Add-Content -LiteralPath $OutFile -Value $content -Encoding utf8

        # trailing newline for readability
        "" | Out-File -FilePath $OutFile -Encoding utf8 -Append
        "" | Out-File -FilePath $OutFile -Encoding utf8 -Append
    } catch {
        # continue on errors, but log minimal info to dump file
        $errLine = "[ERROR] Failed to include file: $($f.FullName) - $($_.Exception.Message)"
        $errLine | Out-File -FilePath $OutFile -Encoding utf8 -Append
    }
}

"Completed: $(Get-Date -Format o)" | Out-File -FilePath $OutFile -Encoding utf8 -Append
