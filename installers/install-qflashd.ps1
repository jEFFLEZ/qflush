# PowerShell installer for qflashd (Windows service wrapper)
# This is an example; for production use consider NSSM or sc.exe wrapper.

Write-Host "This script downloads qflash and registers qflashd as a scheduled task or service."
Write-Host "Manual step: create a Windows service pointing to 'node dist/daemon/qflashd.js' using nssm or sc.exe."

# Example using nssm (assuming nssm.exe is available):
# nssm install qflashd "C:\Program Files\nodejs\node.exe" "C:\path\to\qflash\dist\daemon\qflashd.js"

Write-Host "Install instructions provided."
