import { auth } from './config'

type ApiResponse<T> = { result?: T; error?: { message?: string; code?: string } }

/**
 * Chama rotas em `/api/*` no deploy Vercel (substitui Cloud Functions).
 * Corpo: `{ data: payload }` · auth: `Authorization: Bearer <idToken>`.
 */
export async function vercelApiCall<TResponse>(
  routeName: string,
  data: Record<string, unknown> = {},
): Promise<TResponse> {
  const base = (import.meta.env.VITE_VERCEL_API_URL as string | undefined)?.trim()
  if (!base) {
    throw new Error(
      'Defina VITE_VERCEL_API_URL no .env (URL do site na Vercel, ex.: https://semaleatorio.vercel.app).',
    )
  }
  if (!auth?.currentUser) {
    throw new Error('Faça login.')
  }
  const token = await auth.currentUser.getIdToken()
  const url = `${base.replace(/\/$/, '')}/api/${routeName}`
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
  return Boolean((import.meta.env.VITE_VERCEL_API_URL as string | undefined)?.trim())
}
