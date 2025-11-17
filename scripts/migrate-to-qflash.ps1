param([string]$ProjectPath = '.')
Set-Location $ProjectPath

Write-Host "Installing @funeste38/qflash..."
npm install @funeste38/qflash --save

Get-ChildItem -Path . -Recurse -Include *.ts,*.js,*.tsx,*.jsx | ForEach-Object {
  (Get-Content $_.FullName) -replace "from '@funeste38/rome'", "from '@funeste38/qflash'" | Set-Content $_.FullName
}
Write-Host "Migration done. Please review and run tests."