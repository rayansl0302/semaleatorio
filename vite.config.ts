import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget =
    env.VITE_DEV_API_PROXY?.trim() || 'http://127.0.0.1:3000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/__riot-oauth/token': {
          target: 'https://auth.riotgames.com',
          changeOrigin: true,
          rewrite: () => '/token',
        },
        '/__riot-oauth/account-me': {
          target: 'https://americas.api.riotgames.com',
          changeOrigin: true,
          rewrite: () => '/riot/account/v1/accounts/me',
        },
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
