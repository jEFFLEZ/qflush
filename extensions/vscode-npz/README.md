# Qflash – NPZ Visual

Qflash Visual est l’extension officielle pour visualiser et contrôler le moteur Qflash / NPZ depuis VS Code / VSCodium / Theia.

## Fonctionnalités

- Visualisation des scores NPZ en temps réel
- Panel HTML interactif
- Commandes : `qflash.openPanel`, `qflash.showLicenseStatus`
- Intégration avec le daemon Qflash local (`http://localhost:4500`)
- Préparation pour activation licence Gumroad

## Installation

- Installer Qflash (npm) :

```sh
npm i -g @funeste38/qflash
```

- Lancer le daemon :

```
qflash daemon
```

- Depuis VSCodium, installer l’extension Qflash depuis Open VSX.

## Commands

- `qflash.openPanel` – Ouvre le panneau NPZ Scores
- `qflash.showLicenseStatus` – Affiche l’état de la licence

## Licence
MIT – © Funesterie
