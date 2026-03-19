# budget-app

Application React + Vite de suivi de budget personnel pour plusieurs comptes CAD/EUR, avec persistance en `localStorage` et déploiement sur GitHub Pages.

## Lancer localement

```bash
npm install
npm run dev
```

## Déploiement GitHub Pages

- `vite.config.js` utilise `base: '/bankapp/'` pour le dépôt GitHub Pages.
- Le workflow `.github/workflows/deploy.yml` construit l'application à chaque push sur `main` puis publie `dist/` sur la branche `gh-pages`.
- Dans GitHub → **Settings** → **Actions** → **General**, activez **Read and write permissions** pour permettre le déploiement.
