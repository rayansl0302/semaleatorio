/**
 * Chamadas ao Express local/remoto. A chave Riot e outras credenciais ficam no servidor;
 * o browser só envia o JWT Firebase.
 */
import {
  backendApiBaseUrlConfigured,
  getBackendApiBaseUrl,
} from '../lib/backendApiUrl'
import { auth } from './config'

type ApiResponse<T> = { result?: T; error?: { message?: string; code?: string } }

/**
 * Chama rotas `POST /api/*` no backend (Railway, Vercel, etc.).
 * Corpo: `{ data: payload }` · auth: `Authorization: Bearer <idToken>`.
 */
export async function vercelApiCall<TResponse>(
  routeName: string,
  data: Record<string, unknown> = {},
): Promise<TResponse> {
  const base = getBackendApiBaseUrl()
  if (!base) {
    throw new Error(
      'Defina VITE_API_URL ou VITE_BACKEND_URL no .env (raiz) — URL do servidor Node, sem barra no fim. Ex.: http://localhost:8787. Opcional: VITE_VERCEL_API_URL (só API Vercel).',
    )
  }
  if (!auth?.currentUser) {
    throw new Error('Faça login.')
  }
  const token = await auth.currentUser.getIdToken()
  const url = `${base}/api/${routeName}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data }),
  })
  let json: ApiResponse<TResponse> = {}
  try {
    json = (await res.json()) as ApiResponse<TResponse>
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(
      json.error?.message ?? `Erro ${res.status} ao chamar ${routeName}`,
    )
  }
  return json.result as TResponse
}

export function vercelApiConfigured(): boolean {
  return backendApiBaseUrlConfigured()
}
