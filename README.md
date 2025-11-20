# @funeste38/qflush ⚡

QFLUSH est l'orchestrateur du réseau Funesterie — démarrage, arrêt, purge, inspection et synchronisation des modules.

Version actuelle
----------------
Pré-release: v3.1.0 — "Funesterie ne fait que commencer" (pré-release publique).

Nouveautés clés en 3.1
---------------------
- Intégration officielle du *Rome linker* : scanner de tokens `[[token]]` dans le workspace et génération du fichier `.qflush/rome-links.json`.
- Endpoints daemon pour exploiter les liens Rome :
  - `GET  /npz/rome-links` — lister les liens actuels
  - `POST /npz/rome-links/regenerate` — régénérer et écrire `.qflush/rome-links.json`
  - `GET  /npz/rome-links/resolve?from=...&token=...` — résoudre un token depuis un fichier
  - `GET  /npz/rome-links/stream` — SSE pour les mises à jour des liens
- Mécanisme de checksum NPZ (store/verify/list/clear) et utilitaire CLI `qflush checksum`.
- Préparation de hooks A11 / SPYDER (commandes placeholders `qflush a11` et `qflush spyder` — "coming soon").

Installation
------------
Depuis npm (future publication):

```
npm install -g @funeste38/qflush
```

Local (tester la pré-release):

```
npm pack
npm install -g ./funeste38-qflush-3.1.0.tgz
qflush --help
```

Commandes principales
---------------------
- `qflush start`      → lancer la stack (detect → config → start)
- `qflush kill`       → killer proprement les services
- `qflush purge`      → vider caches, logs et sessions
- `qflush inspect`    → afficher l'état et les ports
- `qflush config`     → générer des `.env` par défaut
- `qflush rome:links` → calculer et écrire `.qflush/rome-links.json`

Endpoints du daemon (qflush daemon must be running)
--------------------------------------------------
- `POST /npz/checksum/store`  — stocker un checksum `{ id, checksum, ttlMs? }`
- `POST /npz/checksum/verify` — vérifier et consommer un checksum `{ id, checksum }`
- `GET  /npz/checksum/list`   — lister checksums actifs
- `DELETE /npz/checksum/clear`— vider le store
- `GET  /npz/rome-index`      — exposer l'index Rome chargé
- `GET  /npz/rome-links`      — lister liens calculés
- `POST /npz/rome-links/regenerate` — regénérer tous les liens
- `GET  /npz/rome-links/resolve`    — résoudre un token (params `from`, `token`)
- `GET  /npz/rome-links/stream`     — SSE notifications sur mise à jour des liens

Développement & build
---------------------
- Build TypeScript : `npm run build` (gcc => `dist/`)
- Tests unitaires : `npm test` (vitest)
- Lint Rome : `npm run lint:rome`

Troubleshooting — freezes sous Windows
-------------------------------------
Si tu rencontres des problèmes de "freeze" (processus qui ne répondent plus) lors des opérations de supervision, QFLUSH tente de suspendre les processus sur Windows en utilisant `PsSuspend` (Sysinternals). Si `PsSuspend` n'est pas disponible, QFLUSH retombe automatiquement sur `taskkill /F` (arrêt forcé).

Procédure recommandée :
- Télécharger Sysinternals (PsSuspend) depuis Microsoft : https://learn.microsoft.com/sysinternals/downloads/sysinternals-suite
- Extraire `PsSuspend.exe` dans un dossier local (ex. `C:\tools\sysinternals`).
- Soit ajouter ce dossier au `PATH`, soit définir la variable d'environnement `QFLUSH_PSSUSPEND_PATH` qui contient le chemin complet vers `PsSuspend.exe`.
  - PowerShell : `$env:QFLUSH_PSSUSPEND_PATH='C:\tools\sysinternals\PsSuspend.exe'`
  - Bash : `export QFLUSH_PSSUSPEND_PATH='/c/tools/sysinternals/PsSuspend.exe'`

Test rapide (PowerShell) :
```
Start-Process notepad
Get-Process notepad
& 'C:\tools\sysinternals\PsSuspend.exe' <PID>
& 'C:\tools\sysinternals\PsSuspend.exe' -r <PID>
```

Notes de sécurité et bonnes pratiques :
- Ne commite jamais de binaires dans le dépôt. QFLUSH ne contient pas `PsSuspend.exe` ; tu l'installes localement.
- L'utilisation de `PsSuspend` peut nécessiter des droits administrateur selon le processus ciblé.
- En l'absence de `PsSuspend`, QFLUSH utilisera `taskkill /F` — attention : cela termine le processus.

Roadmap (aperçu)
-----------------
- v3.1.x : stabilisation TS, intégration Rome linker, préparation release
- v3.2+ : notifications temps réel (SSE/WS), résolution interactive des ambiguïtés
- A11 : interface IA (hooks prévus dans QFLUSH comme orchestrateur)
- SPYDER : réseau interne / moteur logique (hooks placeholders ajoutés)

Contribuer
----------
PRs bienvenues. Voir `docs/qflush-plan.md` pour la stratégie 3.1 et les tâches Copilot-ready.

Licence
-------
Voir `LICENSE-FUNESTERIE.txt` et les notices tierces.

QFLUSH — Quickstart

This repository contains QFLUSH (daemon, CLI and helpers).

Quick local setup

1) Copy .env example and keep safe defaults (disable Redis/Copilot for local dev):
   - PowerShell:
     Copy-Item .env.example .env; notepad .env
   - Bash:
     cp .env.example .env; ${EDITOR:-nano} .env

2) Install dependencies and build:
   npm ci --no-audit --no-fund
   npm run build

3) Run tests:
   npm test

Secrets and tokens

- For local testing you can store secrets encrypted (Windows DPAPI) using the helper:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\import-env-to-secrets.ps1 -EnvPath "$env:USERPROFILE\Desktop\.env" -RestrictFileAcl

- To set GitHub repo secrets (if `gh` is available):
  pwsh .\scripts\set-secrets.ps1 -Repo 'owner/repo' -PersistLocal -Quiet -NoPrompt

Packaging & publishing

- Create an npm package tarball locally:
  npm pack
  -> produces `funeste38-qflush-<version>.tgz`

- Create a GitHub release and upload the tarball (requires `gh` auth with `repo` scope):
  gh release create vX.Y.Z ./funeste38-qflush-*.tgz --repo owner/repo --title "qflush vX.Y.Z" --notes "release"

Automated release (CI)

- A workflow `.github/workflows/publish-tgz.yml` is included to pack and publish the tgz when a tag `v*` is pushed.
  To trigger the workflow create and push a tag:
    git tag -a vX.Y.Z -m "release vX.Y.Z"
    git push origin vX.Y.Z

Scripts & helpers

- `scripts/run-with-timeout.ps1` - run a command with a timeout (quiet by default).
- `scripts/run-with-timeout.sh` - POSIX watchdog.
- `scripts/detach.js` - spawn a detached process (use `--quiet`).
- `scripts/import-env-to-secrets.ps1` - import a .env file and store encrypted secrets (Windows DPAPI).
- `scripts/set-secrets.ps1` - set GitHub secrets via `gh` or write `.env.local`; supports `-Quiet` and `-NoPrompt`.

Notes

- `.env` is gitignored by design. Do not commit tokens or secrets.
- Default dev mode disables Redis and Copilot (see `.env.example`).

If you want, I can also open a PR with this README update (`push+pr`) or create a shorter `docs/quick-start.md`. Reply with `push+pr` or `docs` if desired.
