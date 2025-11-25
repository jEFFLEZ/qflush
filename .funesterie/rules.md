# Funesterie Rules v1 — Core Project Style

## Architecture
- Le code source est structuré en:
  - `src/core` → état qflush, apply, config, archive, state.
  - `src/cortex` → packet, router, types, resonnance, vision.
  - `src/utils` → helpers génériques (fs, logs, json, network).
  - `src/commands` → commandes CLI (minces, sans logique).
  - `src/legacy` → anciens fichiers (rome, daemon, etc.)

## Principes
1. **Règle d’or** : pas de logique métier dans les commandes.
2. `apply` doit être pur et testable en isolation.
3. Le router cortex ne doit contenir *aucun IO direct*.
4. Les modules externes sont appelés via des adaptateurs.
5. Toute mutation d’état va dans `src/core/state.ts`.
6. Toute lecture / écriture `.qflush` se fait via `core/fs`.
7. Toute décision automatique doit être overrideable via config.
8. Chaque handler Cortex possède :
   - un input typé
   - un output (void | result)
   - pas d’effet de bord caché
9. OC8/PNG doit être traité dans `cortex/vision.ts` uniquement.
10. SPYDER écrit toujours dans `.qflush/spyder-*`.

## Objectifs de refactor
- Clarifier les chemins d’import.
- Uniformiser logs : `[QFLUSH]`, `[CORTEX]`, `[SPYDER]`, `[RESO]`.
- Séparer logique par domaine.
- Réduire complexité cyclomatique sous 10.
- Centraliser config & flags.
- Déplacer legacy hors du flux principal.
