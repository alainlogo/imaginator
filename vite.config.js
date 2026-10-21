import { readFileSync } from 'node:fs'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Les en-têtes de sécurité de vercel.json sont aussi appliqués à `npm run preview`,
// pour tester le build en local dans les mêmes conditions qu'en production
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
const securityHeaders = Object.fromEntries(
  vercel.headers.find((rule) => rule.source === '/(.*)').headers.map(({ key, value }) => [key, value]),
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    // Options API activée (valeur par défaut, explicitée ici)
    __VUE_OPTIONS_API__: 'true',
  },
  build: {
    // Pas de source maps publiées en production
    sourcemap: false,
    // Les polices restent des fichiers à part (pas de data: URI), ce qui permet
    // une Content-Security-Policy stricte « font-src 'self' »
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
  preview: {
    headers: securityHeaders,
  },
})
