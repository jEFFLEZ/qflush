<<<<<<< HEAD
# QFLUSH Installer

This folder contains a PowerShell installer `install-qflush.ps1` that can:

- Install QFLUSH for the current user (default) by copying compiled `dist` files to `%APPDATA%\Funeste38\QFlush` and adding the folder to user PATH.
- Install QFLUSH system-wide (requires Administrator) by copying to `C:\Program Files\Funesterie\QFlush` and adding to machine PATH.
- Install via npm global if the package is published: `install-qflush.ps1 -Mode npm`.
=======
# QFLASH Installer

This folder contains a PowerShell installer `install-qflash.ps1` that can:

- Install QFLASH for the current user (default) by copying compiled `dist` files to `%APPDATA%\Funeste38\QFlash` and adding the folder to user PATH.
- Install QFLASH system-wide (requires Administrator) by copying to `C:\Program Files\Funesterie\QFlash` and adding to machine PATH.
- Install via npm global if the package is published: `install-qflash.ps1 -Mode npm`.
>>>>>>> 9c20528 (chore(qflash): initial scaffold, smartchain, installers, CI)

Usage examples:

PowerShell (current user):
<<<<<<< HEAD
PS> .\install-qflush.ps1 -Mode user

PowerShell (system/admin):
PS> Start-Process powershell -Verb runAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "install-qflush.ps1" -Mode system'

NPM global install (requires published package):
PS> .\install-qflush.ps1 -Mode npm

## Notes

Use `qflush --help` after installation to list available commands.
=======
PS> .\install-qflash.ps1 -Mode user

PowerShell (system/admin):
PS> Start-Process powershell -Verb runAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "install-qflash.ps1" -Mode system'

NPM global install (requires published package):
PS> .\install-qflash.ps1 -Mode npm
>>>>>>> 9c20528 (chore(qflash): initial scaffold, smartchain, installers, CI)
