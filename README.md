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
