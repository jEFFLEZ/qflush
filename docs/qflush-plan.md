# QFLUSH — PLAN CONCRET À EXÉCUTER

Objectif : stabiliser QFLUSH v3.1, intégrer le linker ROME, préparer le terrain A11/SPYDER.

Étape 1 — Stabilisation build / TS
- Corriger imports cassés : ./chain/smartChain, ./daemon/qflushd(.js), ./commands/doctor, ./commands/compose, ./cli/help, ../utils/fetch.
- Remplacer usages de `node` / `env` nus par process.env (ex: process.env.NODE_ENV).
- S'assurer que tous les shebangs `#!/usr/bin/env node` sont en ligne 1 des fichiers .ts concernés.
- Supprimer ou corriger les `declare module './...'` en noms non-relatifs (ex: 'src/rome/storage').
- Laisser `// @ts-nocheck` sur les polyfills JS et exclure extensions/**/out/** dans tsconfig.
- Vérifier que `npx tsc -p . --noEmit` ne renvoie aucune erreur.

Étape 2 — Intégration du linker ROME
- Créer src/rome/linker.ts avec computeRomeLinks(...) et writeRomeLinks(...), utilisant loadRomeIndexFromDisk() et détectant les tokens [[token]] dans src/**.
- Ajouter une commande src/commands/rome-links.ts qui appelle computeRomeLinks + writeRomeLinks et log le nombre de refs.
- Brancher rome-links dans le router CLI (qflush rome:links).
- Optionnel : sur onRomeIndexUpdated, relancer computeRomeLinks pour rafraîchir .qflush/rome-links.json.

Étape 3 — Pré-release 3.1
- Mettre à jour README pour décrire QFLUSH v3.x (orchestrateur, daemon, NPZ, checksum, Copilot bridge, Rome linker).
- Vérifier package.json (name, version, bin.qflush).
- Générer un .tgz, tester une installation globale locale, puis tagguer v3.1.0.

Étape 4 — Hooks pour A11 / SPYDER (préparation)
- Ajouter des clés A11 / SPYDER dans SERVICE_MAP (même si les modules ne sont pas encore publiés).
- Ajouter des commandes placeholders qflush a11:status et qflush spyder:status qui renvoient un message "coming soon".
- Documenter dans README la roadmap A11 (interface IA) et SPYDER (internet interne).

// Fin du plan QFLUSH.
