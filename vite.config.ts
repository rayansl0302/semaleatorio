import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Prefixo '' = lê todo o .env no Node (só usamos chaves aqui; não injeta no bundle).
  // Assim VITE_FIREBASE_PROJECT_ID não “some” e o proxy /__sem_fn/* deixa de dar 404.
  const env = loadEnv(mode, process.cwd(), '')
  const projectId =
    env.VITE_FIREBASE_PROJECT_ID?.trim() ||
    process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
    ''
  const region =
    env.VITE_FIREBASE_FUNCTIONS_REGION?.trim() ||
    process.env.VITE_FIREBASE_FUNCTIONS_REGION?.trim() ||
    'us-central1'
  const fnHost =
    projectId && region ? `https://${region}-${projectId}.cloudfunctions.net` : ''

  if (mode === 'development' && !fnHost) {
    console.warn(
      '[vite] Defina VITE_FIREBASE_PROJECT_ID no .env para o proxy /__sem_fn → Cloud Functions (senão callables dão 404).',
    )
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      ...(fnHost
        ? {
            proxy: {
              '/__sem_fn': {
                target: fnHost,
                changeOrigin: true,
                secure: true,
                rewrite: (path: string) => path.replace(/^\/__sem_fn/, ''),
              },
            },
          }
        : {}),
    },
  }
})
