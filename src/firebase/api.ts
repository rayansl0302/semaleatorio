/**
 * Chamadas ao Express local/remoto. A chave Riot e outras credenciais ficam no servidor;
 * o browser só envia o JWT Firebase.
 */
import {
  backendApiBaseUrlConfigured,
  resolveBackendApiRequestUrl,
} from '../lib/backendApiUrl'
import { auth } from './config'

type ApiResponse<T> = { result?: T; error?: { message?: string; code?: string } }

/**
 * Chama rotas `POST /api/*` na Vercel (ou outro host onde as serverless functions estão).
 * Corpo: `{ data: payload }` · auth: `Authorization: Bearer <idToken>`.
 */
export async function vercelApiCall<TResponse>(
  routeName: string,
  data: Record<string, unknown> = {},
): Promise<TResponse> {
  if (!backendApiBaseUrlConfigured()) {
    throw new Error(
      'Defina VITE_API_URL ou VITE_BACKEND_URL no .env (raiz) — URL com as rotas /api, sem barra no fim. Em dev podes usar proxy: corre `npx vercel dev` e deixa VITE_API_URL vazio.',
    )
  }
  if (!auth?.currentUser) {
    throw new Error('Faça login.')
  }
  const token = await auth.currentUser.getIdToken()
  const url = resolveBackendApiRequestUrl(routeName)
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
