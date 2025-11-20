# Utilitaires Sysinternals (PsSuspend) pour QFLUSH

Ce document explique comment installer PsSuspend (Sysinternals) et comment l'utiliser de façon sécurisée avec QFLUSH. Ne commite jamais de binaires dans le dépôt — préfère installer localement et référencer le chemin via une variable d'environnement.

## Pourquoi PsSuspend ?
- Permet de *suspendre* un processus sous Windows sans le tuer (utile pour "freezeAll").
- QFLUSH essaie d'utiliser PsSuspend si disponible, sinon retombe sur `taskkill` (terminaison forcée).

## Installation recommandée
1. Télécharge la suite Sysinternals depuis Microsoft :
   - https://learn.microsoft.com/sysinternals/downloads/sysinternals-suite
2. Extrait `PsSuspend.exe` dans un dossier sur ta machine, par exemple `C:\tools\sysinternals`.
3. (Optionnel) Ajoute ce dossier à ton `PATH`, ou définis la variable d'environnement spécifique :
   - PowerShell : `$env:QFLUSH_PSSUSPEND_PATH = 'C:\tools\sysinternals\PsSuspend.exe'`
   - Bash : `export QFLUSH_PSSUSPEND_PATH='/c/tools/sysinternals/PsSuspend.exe'`

## Utilisation avec QFLUSH
- Si `QFLUSH_PSSUSPEND_PATH` est défini, QFLUSH l'utilisera pour suspendre/reprendre les processus.
- Sinon QFLUSH cherchera `pssuspend` dans le `PATH`.
- Si PsSuspend est indisponible, QFLUSH utilise `taskkill /F` en dernier recours.

## Commandes de test (PowerShell)
- Lancer Notepad : `Start-Process notepad`
- Trouver son PID : `Get-Process notepad`
- Suspendre manuellement (si PsSuspend installé) : `& 'C:\tools\sysinternals\PsSuspend.exe' <PID>`
- Reprendre : `& 'C:\tools\sysinternals\PsSuspend.exe' -r <PID>`

## Intégration dans QFLUSH
- QFLUSH lit `QFLUSH_PSSUSPEND_PATH` si défini ; sinon `pssuspend` depuis le `PATH` est essayé.
- Le code de `freezeAll` fait une tentative non bloquante et tombe sur `taskkill` si nécessaire.

## Sécurité et bonnes pratiques
- Ne commite jamais `PsSuspend.exe` ni d'autres binaires Sysinternals dans le dépôt.
- Place les utilitaires dans un répertoire système (`C:\tools\sysinternals`) et documente leur chemin.
- Exécute les commandes en tant qu'administrateur si tu as besoin de suspendre/reprendre des processus systèmes.

## Si besoin d'aide
Si tu veux, je peux :
- ajouter un script de vérification qui signale si `QFLUSH_PSSUSPEND_PATH` est valide, ou
- ajouter un exemple de configuration dans `README.md`.

