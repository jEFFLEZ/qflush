# Fix + (re)install @funeste38/qflush v3.1.2 and create working shims
# Usage: exécuter dans un PowerShell lancé en Administrateur depuis la racine du repo
$ErrorActionPreference = 'Stop'

# 0) check admin
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error "Exécutez ce script en tant qu'administrateur."
  exit 1
}

# 1) variables
$repoRoot = (Get-Location).Path      # utilise répertoire courant
$pkgName = '@funeste38/qflush'
$githubTag = 'github:jEFFLEZ/qflush#v3.1.2'
$appNpm = Join-Path $env:APPDATA 'npm'
$groot = (& npm root -g).Trim()

# 2) cleanup anciens shims / paquets
Write-Output "Removing old global packages and shims (if any)..."
try { npm uninstall -g $pkgName @funeste38/qflush 2>$null } catch {}
Get-ChildItem $appNpm -Filter 'qflush*' -File -ErrorAction SilentlyContinue | ForEach-Object { Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue }

# 3) if repo present, build & pack
$tgzToInstall = $null
if (Test-Path $repoRoot) {
  Write-Output "Repo found at $repoRoot — building..."
  Push-Location $repoRoot
  try {
    npm ci
    npm run build
    npm pack | Out-Null
    $tgz = Get-ChildItem -Path $repoRoot -Filter '*.tgz' -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($tgz) { $tgzToInstall = $tgz.FullName; Write-Output "Packed TGZ: $tgzToInstall" }
  } finally { Pop-Location }
}

# 4) install (prefer local tgz if present)
if ($tgzToInstall) {
  Write-Output "Installing from local tgz..."
  npm install -g $tgzToInstall
} else {
  Write-Output "Installing from GitHub tag $githubTag..."
  npm install -g $githubTag
}

# 5) determine dist and package.json paths (prefer global package, fallback local repo)
$pkgGlobalDir = Join-Path $groot ('@funeste38\qflush')
$distPath = $null; $pkgJson = $null
if (Test-Path (Join-Path $pkgGlobalDir 'dist\index.js')) {
  $distPath = Join-Path $pkgGlobalDir 'dist\index.js'
  $pkgJson  = Join-Path $pkgGlobalDir 'package.json'
  Write-Output "Using global package dist: $distPath"
} elseif (Test-Path (Join-Path $repoRoot 'dist\index.js')) {
  $distPath = Join-Path $repoRoot 'dist\index.js'
  $pkgJson  = Join-Path $repoRoot 'package.json'
  Write-Output "Using local repo dist: $distPath"
} else {
  Write-Error "Impossible de trouver dist/index.js ni global ni local. Assurez-vous que build a réussi."
  exit 2
}

# 6) prepare paths for require() inside node -e -> use forward slashes to avoid JS escape issues
$pkgJsonForRequire = ($pkgJson -replace '\\','/')

# 7) ensure appNpm exists and is in PATH for session
if (-not (Test-Path $appNpm)) { New-Item -ItemType Directory -Path $appNpm | Out-Null }
if ((($env:PATH) -split ';') -notcontains $appNpm) {
  $env:PATH = "$appNpm;$env:PATH"
  Write-Output "Added $appNpm to PATH for this session."
}

# 8) write robust shims (cmd + powershell) and wrapper
$cmdPath = Join-Path $appNpm 'qflush.cmd'
$ps1Path = Join-Path $appNpm 'qflush.ps1'
$wrapperPath = Join-Path $appNpm 'qflush-cli.js'

# wrapper JS content
$wrapperContent = @'
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function exists(p){ try { return p && fs.existsSync(p); } catch { return false; } }

const candidates = [
  path.join(process.env.APPDATA || "", "npm", "node_modules", "@funeste38", "qflush"),
  path.join(__dirname, "node_modules", "@funeste38", "qflush"),
  path.join(process.cwd(), "node_modules", "@funeste38", "qflush"),
  path.join(process.cwd())
];

let pkgDir = null;
for (const c of candidates) {
  if (exists(c)) { pkgDir = c; break; }
}

let pkgJsonPath = pkgDir ? path.join(pkgDir, "package.json") : null;
let distPath = pkgDir ? path.join(pkgDir, "dist", "index.js") : null;
if (!pkgJsonPath || !exists(pkgJsonPath)) pkgJsonPath = path.join(process.cwd(), "package.json");
if (!distPath || !exists(distPath)) {
  const localDist = path.join(process.cwd(), "dist", "index.js");
  if (exists(localDist)) distPath = localDist;
}

const argv = process.argv.slice(2);
if (argv[0] === "--version" || argv[0] === "-v") {
  try {
    const pkg = require(pkgJsonPath);
    console.log(pkg && pkg.version ? pkg.version : "unknown");
  } catch (e) {
    console.log("unknown");
  }
  process.exit(0);
}

if (!distPath || !exists(distPath)) {
  console.error('qflush: dist not found. Run `npm run build` in the repo or install the package globally.');
  process.exit(1);
}

const child = spawn(process.execPath, [distPath, ...argv], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code));
'@

Set-Content -Path $wrapperPath -Value $wrapperContent -Encoding UTF8 -Force

$cmdContent = @"
@echo off
if "%1"=="--version" goto version
if "%1"=="-v" goto version
node "%APPDATA%\npm\qflush-cli.js" %*
goto end
:version
node "%APPDATA%\npm\qflush-cli.js" --version
:end
"@

$ps1Content = @"
param([Parameter(ValueFromRemainingArguments=`$true)] `$args)
`$first = if (`$args.Length -gt 0) { `$args[0] } else { '' }
if (`$first -eq '--version' -or `$first -eq '-v') {
  node `"$env:APPDATA\npm\qflush-cli.js`" --version
  exit 0
}
& node `"$env:APPDATA\npm\qflush-cli.js`" @args
"@

Set-Content -Path $cmdPath -Value $cmdContent -Encoding ASCII -Force
Set-Content -Path $ps1Path -Value $ps1Content -Encoding UTF8 -Force

Write-Output "Shims written:"
Write-Output " - $cmdPath"
Write-Output " - $ps1Path"
Write-Output " - $wrapperPath"

# 9) final checks
Write-Output "`nContents of $appNpm (qflush*):"
Get-ChildItem $appNpm -Filter 'qflush*' -File | Select-Object Name,FullName | Format-Table

Write-Output "`nAttempting to run: qflush --version (same session)"
try { qflush --version | Write-Output } catch { Write-Output 'qflush not recognized in this session — rouvrir le shell si nécessaire' }

Write-Output "`nIf qflush n'est toujours pas trouvé: fermez puis rouvrez PowerShell (Developer PowerShell) et exécutez `qflush --version`."
