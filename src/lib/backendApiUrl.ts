/**
 * URL base do servidor SemAleatório (Express) — POST /api/*.
 * O front nunca usa a API da Riot diretamente; só este backend (onde está RIOT_API_KEY).
 *
 * Ordem: VITE_API_URL → VITE_BACKEND_URL → VITE_VERCEL_API_URL
 *
 * Usa só a origem + path opcional se o backend estiver num subpath.
 * Ex.: http://localhost:8787 · https://xxx.up.railway.app
 * Se colares .../api no fim, o sufixo /api é removido (as rotas já são /api/...).
 */
const PLACEHOLDER_SNIPPETS = [
  'seu-backend',
  'seu-projeto',
  'your-backend',
  'localhost:0000',
  'example.com',
]

function looksLikePlaceholder(raw: string): boolean {
  const lower = raw.toLowerCase()
  return PLACEHOLDER_SNIPPETS.some((s) => lower.includes(s))
}

export function normalizeBackendApiBaseUrl(raw: string): string {
  let s = raw.trim()
  if (!s) return ''
  if (!/^https?:\/\//i.test(s)) {
    s = `http://${s}`
  }
  const u = new URL(s)
  let path = u.pathname.replace(/\/+$/, '') || ''
  if (path === '/api') {
    path = ''
  } else if (path.endsWith('/api')) {
    path = path.slice(0, -4).replace(/\/+$/, '') || ''
  }
  return path ? `${u.origin}${path}` : u.origin
}

export function getBackendApiBaseUrl(): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>
  const candidates = [
    env.VITE_API_URL,
    env.VITE_BACKEND_URL,
    env.VITE_VERCEL_API_URL,
  ]
  for (const c of candidates) {
    const t = c?.trim()
    if (!t) continue
    if (looksLikePlaceholder(t)) continue
    const base = normalizeBackendApiBaseUrl(t)
    if (base) return base
  }
  return undefined
}

export function backendApiBaseUrlConfigured(): boolean {
  return Boolean(getBackendApiBaseUrl())
}
