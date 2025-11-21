<#
PowerShell helper to install qflush locally and build + publish the VS Code extension to Azure Marketplace.
Usage (run as Administrator PowerShell) from repo root (D:\qflush):

Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\scripts\install-and-publish.ps1

The script will:
 - install node deps and build the project
 - install the CLI globally (npm install -g .)
 - build the VS Code extension
 - package the VSIX and publish it to Azure DevOps Marketplace using tfx (prompts for PAT)

You will be prompted for a Personal Access Token (PAT). Do not paste it here.
#>

function To-UnsecureString([securestring] $s) {
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

Write-Host "Installing project dependencies and building..." -ForegroundColor Cyan
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed"; exit 1 }

npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "npm run build failed"; exit 1 }

Write-Host "Installing qflush CLI globally (requires admin)..." -ForegroundColor Cyan
npm install -g .
if ($LASTEXITCODE -ne 0) { Write-Error "npm install -g . failed"; exit 1 }

Write-Host "Building VS Code extension..." -ForegroundColor Cyan
Push-Location extensions/vscode-npz
npm ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Write-Error "npm ci failed in extension"; Pop-Location; exit 1 }

npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Extension build failed"; Pop-Location; exit 1 }

# ensure tfx is installed
Write-Host "Ensuring tfx-cli is installed..." -ForegroundColor Cyan
npm install -g tfx-cli@0.7.0
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to install tfx-cli"; Pop-Location; exit 1 }

# create vsix
Write-Host "Packaging VSIX..." -ForegroundColor Cyan
try {
  tfx extension create --manifest-globs vss-extension.json --output-path .. | Write-Host
} catch {
  Write-Warning "tfx extension create returned non-zero but will continue if vsix exists"
}

# find vsix
$vsix = Get-ChildItem -Path .. -Filter *.vsix | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $vsix) { Write-Error "VSIX not found in repo root"; Pop-Location; exit 1 }

Write-Host "VSIX packaged: $($vsix.Name)" -ForegroundColor Green

# prompt for PAT
$patSec = Read-Host -AsSecureString "Enter Azure DevOps PAT (will not echo)"
$pat = To-UnsecureString $patSec

if (-not $pat) { Write-Error "No PAT provided"; Pop-Location; exit 1 }

# publish
$publisher = 'funesterie'
Write-Host "Publishing $($vsix.Name) to Marketplace as publisher $publisher..." -ForegroundColor Cyan
$cmd = "tfx extension publish --manifest-globs vss-extension.json --publisher $publisher --token $pat --service-url https://marketplace.visualstudio.com/"
Write-Host $cmd
Invoke-Expression $cmd

if ($LASTEXITCODE -ne 0) { Write-Error "tfx publish failed"; Pop-Location; exit 1 }

Write-Host "Publish command finished. Check Marketplace publisher and pipeline for status." -ForegroundColor Green

Pop-Location
# zero the token variable
$pat = $null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()
Write-Host "Done." -ForegroundColor Green
