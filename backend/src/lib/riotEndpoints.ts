/**
 * Hosts oficiais da Riot (Developer Portal) — fixos no código.
 * O backend é quem chama a Riot com `X-Riot-Token`; o browser nunca vê `RIOT_API_KEY`.
 *
 * Regional: Account v1, etc. → `https://{americas|europe|asia|sea}.api.riotgames.com`
 * Plataforma LoL: League v4 → `https://{br1|na1|…}.api.riotgames.com`
 * OAuth: `https://auth.riotgames.com`
 *
 * @see https://developer.riotgames.com/docs/lol
 */
export const RIOT_REGIONAL_ROUTINGS = [
  'americas',
  'europe',
  'asia',
  'sea',
] as const

export type RiotRegionalRouting = (typeof RIOT_REGIONAL_ROUTINGS)[number]

/** OAuth Riot (authorize / token) — sempre este host. */
export const RIOT_AUTH_BASE_URL = 'https://auth.riotgames.com'

function normalizeRegionalRouting(raw: string): RiotRegionalRouting {
  const v = raw.trim().toLowerCase()
  return (RIOT_REGIONAL_ROUTINGS as readonly string[]).includes(v)
    ? (v as RiotRegionalRouting)
    : 'americas'
}

/** Account v1 + `accounts/me` (OAuth). Cluster configurável (mais próximo do servidor). */
export function regionalRiotApiBaseUrl(): string {
  const fromEnv = process.env.RIOT_ACCOUNT_ROUTING ?? 'americas'
  const cluster = normalizeRegionalRouting(fromEnv)
  return `https://${cluster}.api.riotgames.com`
}

/** League v4 no shard (ex. br1 para BR). */
export function platformRiotApiBaseUrl(platformRouting: string): string {
  const id = platformRouting.trim().toLowerCase() || 'br1'
  return `https://${id}.api.riotgames.com`
}
