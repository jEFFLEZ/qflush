# Qflush – NPZ Visual

Qflush Visual est l’extension officielle pour visualiser et contrôler le moteur Qflush / NPZ depuis VS Code / VSCodium / Theia.

## Fonctionnalités

- Visualisation des scores NPZ en temps réel
- Panel HTML interactif
- Commandes : `qflush.openPanel`, `qflush.showLicenseStatus`
- Intégration avec le daemon Qflush local (`http://localhost:4500`)
- Préparation pour activation licence Gumroad

## Installation

- Installer Qflush (npm) :

```sh
npm i -g @funeste38/qflush
```

- Lancer le daemon :

```
qflush daemon
```

- Depuis VSCodium, installer l’extension Qflush depuis Open VSX.

## Commands

- `qflush.openPanel` – Ouvre le panneau NPZ Scores
- `qflush.showLicenseStatus` – Affiche l’état de la licence

## Licence
MIT – © Funesterie
