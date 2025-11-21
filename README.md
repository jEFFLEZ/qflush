# qflush — Aperçu et guide développeur

Résumé rapide
- qflush est l'orchestrateur (CLI + daemon) principal du projet Funesterie. Le coeur se trouve dans `src/` et la sortie build dans `dist/`.

Architecture (big picture)
- Entrées principales:
  - `src/daemon/qflushd.ts` : serveur HTTP (endpoints admin & NPZ).
  - `src/rome/*` : moteur d'indexation, linker et logique ( règles, exécution d'actions ).
  - `src/commands/*` : implémentation des commandes CLI exposées dans `package.json`.
  - `src/utils/*` : helpers (redis, secrets, fetch, hmac, etc.).

- Flux de données : le daemon expose des endpoints `/npz/*` pour checksum, rome-index et rome-links ; le moteur Rome parcourt et évalue des règles qui déclenchent des actions (ex : `daemon.reload`, `start-service`).

Convention de build / piège courant
- TypeScript : `tsconfig.json` doit avoir `rootDir: "src"` et `include: ["src/**/*"]` — cela permet à `tsc` de générer `dist/daemon/qflushd.js` (les scripts CI s'attendent à `dist/daemon/*`).

Commandes utiles
- Installer dépendances : `npm ci --no-audit --no-fund`
- Builder : `npm run build` (exécute `tsc -p .`).
- Lancer le daemon compilé : `node dist/daemon/qflushd.js` ou `npm start`.
- Tests : `npm test` (Vitest). En CI/Vitest le bootstrap démarre automatiquement la version compilée du daemon via `vitest.setup.js`.

Comportements runtime & variables d'environnement importants
- `QFLUSHD_PORT` : port du daemon (défaut 4500 ou 43421 selon scripts). Tests/CI attendent parfois `4500`.
- `QFLUSH_ENABLE_REDIS` : contrôle l'utilisation de Redis (0 = in-memory fallback).
- `QFLUSH_DISABLE_COPILOT` / `QFLUSH_TELEMETRY` : désactiver la passerelle copilot/telemetry en runtime.
- `VITEST` : si défini, `vitest.setup.js` tente de require et démarrer `dist/daemon/qflushd`.

Points d'intégration et tests
- CI (workflow `CI`) : installe deps, compile (`npx tsc`) et démarre le daemon, puis exécute les tests. Les tests d'intégration vérifient les endpoints `/npz/checksum/*` et `/npz/rome-index`.
- Si vous rencontrez des erreurs de type `dist/daemon/qflushd.js missing` : vérifier `tsconfig.json` (rootDir/include) puis `npm run build`.

Où regarder en priorité
- `src/daemon/qflushd.ts` — comportement du serveur et endpoints.
- `src/rome/` — logique d'indexation et exécution d'actions.
- `src/commands/` — exemples d'utilisation du moteur via la CLI.
- `package.json` — scripts exposés (build, test, start, daemon:spawn, etc.).

Proposition pour la suite
- Voulez-vous que je :
  1) Nettoie le repo pour retirer `dist/` du commit (si vous préférez éviter d'avoir des artefacts de build dans la PR),
  2) Ajoute des extraits d'exemples d'API pour `/npz/*` dans `docs/quick-start.md`,
  3) Ou merge la PR maintenant et continuer l'amélioration de la documentation ?

---
Pour feedback ou détails supplémentaires, dites-moi quelle partie vous voulez développer en priorité.
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

Exemples d'API (endpoints NPZ)

- Store checksum

```bash
curl -X POST "http://localhost:4500/npz/checksum/store" \
   -H "Content-Type: application/json" \
   -d '{"id":"t1","checksum":"abc","ttlMs":60000}'
```

- List checksums

```bash
curl "http://localhost:4500/npz/checksum/list"
```

- Verify checksum (mismatch returns non-200)

```bash
curl -X POST "http://localhost:4500/npz/checksum/verify" \
   -H "Content-Type: application/json" \
   -d '{"id":"t1","checksum":"abc"}'
```

- Clear checksums

```bash
curl -X DELETE "http://localhost:4500/npz/checksum/clear"
```

- Fetch Rome index

```bash
curl "http://localhost:4500/npz/rome-index"
```

Notes:
- En local, la variable `QFLUSHD_PORT` peut être utilisée pour changer le port (ex: `QFLUSHD_PORT=43421`).
- Les tests d'intégration supposent que le daemon compilé expose ces endpoints (via `dist/daemon/qflushd.js`).
