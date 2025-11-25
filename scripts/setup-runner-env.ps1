<#
Setup runner environment variables to avoid port collisions for qflush and spyder.
Run this script on the self-hosted runner (PowerShell as Administrator recommended).
#>

param(
    [int]$QflushPort = 43421,
    [int]$SpyderAdminPort = 4022,
    [switch]$MachineScope
)

function Is-Admin {
    $current = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

Write-Host "Setting runner env: QFLUSHD_PORT=$QflushPort, QFLUSH_SPYDER_ADMIN_PORT=$SpyderAdminPort (MachineScope=$MachineScope)"

try {
    if ($MachineScope.IsPresent -and -not (Is-Admin)) {
        Write-Warning "Machine scope requested but script is not running as Administrator. Re-run as admin to set machine-level variables. Falling back to user-level setx."
    }

    if ($MachineScope.IsPresent -and (Is-Admin)) {
        setx /M QFLUSHD_PORT $QflushPort | Out-Null
        setx /M QFLUSH_SPYDER_ADMIN_PORT $SpyderAdminPort | Out-Null
        Write-Host "Persisted machine-level variables QFLUSHD_PORT and QFLUSH_SPYDER_ADMIN_PORT"
    } else {
        setx QFLUSHD_PORT $QflushPort | Out-Null
        setx QFLUSH_SPYDER_ADMIN_PORT $SpyderAdminPort | Out-Null
        Write-Host "Persisted user-level variables QFLUSHD_PORT and QFLUSH_SPYDER_ADMIN_PORT"
    }

    # also write a helper .qflush/spyder.env in runner home for quick reference
    try {
        $homeQflush = Join-Path $env:USERPROFILE '.qflush'
        if (-not (Test-Path $homeQflush)) { New-Item -ItemType Directory -Path $homeQflush | Out-Null }
        $envFile = Join-Path $homeQflush 'spyder.env'
        "SPYDER_ADMIN_PORT=$SpyderAdminPort`nQFLUSHD_PORT=$QflushPort`n" | Out-File -FilePath $envFile -Encoding utf8 -Force
        Write-Host "Wrote $envFile"
    } catch {
        Write-Warning "Failed to write .qflush/spyder.env: $_"
    }

    Write-Host "To apply machine-level changes you may need to restart the runner service or the machine."
    Write-Host "Current effective values (session): QFLUSHD_PORT=$($env:QFLUSHD_PORT) QFLUSH_SPYDER_ADMIN_PORT=$($env:QFLUSH_SPYDER_ADMIN_PORT)"
} catch {
    Write-Error "Failed to set runner env: $_"
    exit 1
}
