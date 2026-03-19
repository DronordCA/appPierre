# budget-app

Application React + Vite de suivi de budget personnel pour plusieurs comptes CAD/EUR, avec persistance en `localStorage`.

## Pourquoi l'écran blanc arrivait

L'application utilisait une base Vite figée sur `/appPierre/`. Dès que le site était servi depuis une autre URL (racine, aperçu local, autre hébergeur, etc.), les fichiers JS/CSS étaient cherchés au mauvais endroit, ce qui produisait un écran blanc.

La configuration utilise maintenant `base: './'` pour charger les assets de manière relative et fonctionner aussi bien :

- en local avec `npm run dev`
- en build statique avec `npm run build`
- sur GitHub Pages
- sur un autre hébergement statique

## Lancer localement

```bash
npm install
npm run dev
```

## Construire la version de production

```bash
npm run build
```
