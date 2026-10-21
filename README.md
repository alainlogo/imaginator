# Imaginator

Outils d'images qui tournent entièrement dans le navigateur : compresser, convertir
(PNG, JPEG, WebP, AVIF) et retirer l'arrière-plan avec une IA locale.
Aucune image n'est envoyée à un serveur.

## Développement

```bash
npm install
npm run dev       # serveur de développement
npm run build     # build de production dans dist/
npm run preview   # sert le build avec les en-têtes de sécurité de production
```

## Déploiement

Le site est prévu pour Vercel : `vercel.json` définit la réécriture des routes vers
`index.html` et les en-têtes de sécurité (CSP, HSTS, anti-iframe…).

## Sécurité et confidentialité

- Les images restent sur l'appareil ; le site n'a ni backend, ni compte, ni cookie.
- Seule exception : l'outil « Arrière-plan » télécharge son modèle d'IA et son moteur
  depuis `staticimgly.com` au premier usage (version figée, puis mise en cache).
  Pour que ce moteur fonctionne, la CSP autorise `'unsafe-eval'` et les scripts `blob:`.
- Les polices sont servies par le site lui-même (aucune requête vers Google).
