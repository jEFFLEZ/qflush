<<<<<<< HEAD
# QFLUSH — Funesterie Orchestrator ⚡

QFLUSH est l'orchestrateur local de la Funesterie : un CLI + daemon pour démarrer, arrêter, purger, inspecter et synchroniser des modules et flux de travail dans un workspace. Il fournit des endpoints NPZ pour checksum, index Rome et liens, des utilitaires de build et des scripts d'intégration.

Principales capacités
- Orchestration de services (detect → config → start/kill)
- Store NPZ checksum (store/verify/list/clear)
- Intégration Rome (index / liens / SSE)
- CLI ergonomique (`qflush`) et daemon `qflushd`
- Mode développement sans dépendances externes (Redis/Copilot désactivés par défaut)

Pourquoi utiliser QFLUSH ?
- Démarrage rapide d'une stack locale sans surprises
- Outils pour tester et valider les artefacts NPZ
- Scripts sécurisés pour gérer secrets localement (DPAPI sur Windows)

Quickstart (rapide)
1) Copier l'exemple d'env :
   - PowerShell: `Copy-Item .env.example .env; notepad .env`
   - Bash: `cp .env.example .env && ${EDITOR:-nano} .env`
2) Installer et builder :
   `npm ci --no-audit --no-fund && npm run build`
3) Lancer les tests :
   `npm test`
4) Lancer le daemon en dev :
   `qflush daemon` (ou `qflush safe-run --detach daemon`)

Où aller ensuite
- Voir `docs/quick-start.md` pour plus de détails.
- Scripts utiles : `scripts/import-env-to-secrets.ps1` (Windows DPAPI), `scripts/set-secrets.ps1`.

Si tu veux, je peux :
- enrichir ce README avec des exemples d'API (curl),
- ajouter des badges CI/coverage,
- ou pousser ces changements et ouvrir une PR (`push+pr`).
=======
# @funeste38/qflash ⚡

QFLASH is the orchestrator of the Funesterie ecosystem.
Start, stop, purge, inspect, and synchronize modules.

## Commands

- `qflash start`      → launch ecosystem (A-11, Spyder, BAT, etc.)
- `qflash kill`       → kill all processes cleanly
- `qflash purge`      → flush caches + logs + sessions
- `qflash inspect`    → display status and active ports
- `qflash config`     → generate default .env/config files
- `qflash exodia`     → EXODIA feature pending

## Install

npm i -g @funeste38/qflash

## Usage

npx qflash start

## Future

`qflash exodia` will combine A11 + Spyder + BAT + KeyKey + Nezlephant into a single launch protocol.
>>>>>>> 9c20528 (chore(qflash): initial scaffold, smartchain, installers, CI)
