<#
One-step web-style installer for Funesterie (downloads QFLASH and runs installer)
This script assumes you host funeste38-qflash-<version>.tgz at a reachable URL.
#>
param(
    [string]$PackageUrl = "https://example.com/funeste38-qflash-0.1.1.tgz",
    [string]$Mode = 'user'
)

$temp = Join-Path $env:TEMP "qflash_install.tgz"
Invoke-WebRequest -Uri $PackageUrl -OutFile $temp

# extract to AppData
$dest = Join-Path $env:APPDATA "Funeste38\QFlash"
New-Item -ItemType Directory -Path $dest -Force | Out-Null

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($temp, $dest)

Write-Host "QFLASH extracted to $dest"

# add to user PATH
$current = [Environment]::GetEnvironmentVariable('PATH', 'User')
if ($current -notlike "*$dest*") {
  [Environment]::SetEnvironmentVariable('PATH', "$current;$dest", 'User')
  Write-Host "Added $dest to user PATH"
}

Write-Host "Installation complete. Open a new shell and run 'qflash --help'"
