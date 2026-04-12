/**
 * League of Legends — fluxo conforme documentação Riot:
 * https://developer.riotgames.com/docs/lol
 *
 * 1) Account v1 (rotas regionais): GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
 *    BR → cluster AMERICAS → americas.api.riotgames.com
 * 2) League v4 (rotas de plataforma): GET /lol/league/v4/entries/by-puuid/{puuid}
 *    BR → br1.api.riotgames.com
 *
 * Riot ID = gameName + tagLine (ex.: nick da loja + BR1). Não usar summoner-by-name (deprecated).
 */

const ACCOUNT_REGIONAL_HOST = 'https://americas.api.riotgames.com'

const TIER_ORDER = [
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
] as const

const APEX_TIERS = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER'])

function tierScore(tier: string, rank: string, lp: number): number {
  const ti = TIER_ORDER.indexOf(tier.toUpperCase() as (typeof TIER_ORDER)[number])
  const div = ['IV', 'III', 'II', 'I'].indexOf(rank?.toUpperCase() ?? 'IV')
  const base = ti >= 0 ? ti * 400 : 0
  const divPts = div >= 0 ? div * 25 : 0
  return base + divPts + (lp ?? 0) / 100
}

function pickBestEntry(entries: Array<Record<string, unknown>>) {
  let best: Record<string, unknown> | null = null
  let bestScore = -1
  for (const e of entries) {
    const q = String(e.queueType ?? '')
    if (q !== 'RANKED_SOLO_5x5' && q !== 'RANKED_FLEX_SR') continue
    const tier = String(e.tier ?? 'IRON')
    const rank = String(e.rank ?? 'IV')
    const lp = Number(e.leaguePoints ?? 0)
    const s = tierScore(tier, rank, lp) + (q === 'RANKED_SOLO_5x5' ? 1000 : 0)
    if (s > bestScore) {
      bestScore = s
      best = e
    }
  }
  return best
}

/** Formata elo para UI; tiers apex usam só LP (sem divisão IV–I). */
export function formatLeagueEntry(entry: Record<string, unknown>): string {
  const tier = String(entry.tier ?? '').toUpperCase()
  const rank = String(entry.rank ?? '').trim()
  const lp = Number(entry.leaguePoints ?? 0)
  if (!tier) return 'UNRANKED'
  if (APEX_TIERS.has(tier)) {
    return `${tier} · ${lp} LP`
  }
  if (rank) return `${tier} ${rank}`
  return tier
}

function platformLeagueHost(platformRouting: string): string {
  const id = platformRouting.trim().toLowerCase()
  return `https://${id}.api.riotgames.com`
}

export type FetchRankResult = { elo: string; puuid: string }

export type FetchRankErrorKind =
  | 'not-found'
  | 'failed-precondition'
  | 'resource-exhausted'
  | 'internal'

export class FetchRankError extends Error {
  constructor(
    readonly kind: FetchRankErrorKind,
    message: string,
  ) {
    super(message)
    this.name = 'FetchRankError'
  }
}

/**
 * gameName = nome no cliente; tagLine = tag (ex. BR1), sem #.
 * platformRouting = plataforma LoL (docs "Platform Routing Values"), ex. br1 para Brasil.
 */
export async function fetchRankByRiotId(
  apiKey: string,
  gameName: string,
  tagLine: string,
  platformRouting: string,
): Promise<FetchRankResult> {
  const key = apiKey.trim()
  const gn = gameName.trim()
  const tag = tagLine.trim().replace(/^#/, '')

  if (!gn || !tag) {
    throw new FetchRankError('internal', 'Nick e tag obrigatórios.')
  }

  const accPath = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gn)}/${encodeURIComponent(tag)}`
  const accUrl = `${ACCOUNT_REGIONAL_HOST}${accPath}`

  const accRes = await fetch(accUrl, {
    headers: {
      'X-Riot-Token': key,
      Accept: 'application/json',
    },
  })

  if (!accRes.ok) {
    if (accRes.status === 404) {
      throw new FetchRankError(
        'not-found',
        'Riot ID não encontrado. Confira o nome de invocador e a tag (ex.: MeuNick#BR1).',
      )
    }
    if (accRes.status === 401 || accRes.status === 403) {
      throw new FetchRankError(
        'failed-precondition',
        'Chave da API Riot inválida ou sem permissão para este endpoint.',
      )
    }
    if (accRes.status === 429) {
      throw new FetchRankError(
        'resource-exhausted',
        'Limite de requisições da Riot atingido. Aguarde alguns minutos.',
      )
    }
    throw new FetchRankError(
      'internal',
      `Erro na Account API da Riot (HTTP ${accRes.status}).`,
    )
  }

  let acc: { puuid?: string }
  try {
    acc = (await accRes.json()) as { puuid?: string }
  } catch {
    throw new FetchRankError('internal', 'Resposta inválida da Account API da Riot.')
  }

  const puuid = acc.puuid
  if (!puuid || typeof puuid !== 'string') {
    throw new FetchRankError('internal', 'PUUID não retornado pela Riot.')
  }

  const leagueBase = platformLeagueHost(platformRouting || 'br1')
  const leagueUrl = `${leagueBase}/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`

  const leagueRes = await fetch(leagueUrl, {
    headers: {
      'X-Riot-Token': key,
      Accept: 'application/json',
    },
  })

  if (!leagueRes.ok) {
    if (leagueRes.status === 401 || leagueRes.status === 403) {
      throw new FetchRankError(
        'failed-precondition',
        'Chave da API Riot sem acesso ao endpoint de ranqueada (verifique o tipo de chave).',
      )
    }
    if (leagueRes.status === 429) {
      throw new FetchRankError(
        'resource-exhausted',
        'Limite de requisições da Riot atingido. Aguarde alguns minutos.',
      )
    }
    return { elo: 'UNRANKED', puuid }
  }

  let entries: unknown
  try {
    entries = await leagueRes.json()
  } catch {
    return { elo: 'UNRANKED', puuid }
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    return { elo: 'UNRANKED', puuid }
  }

  const best = pickBestEntry(entries as Array<Record<string, unknown>>)
  if (!best) {
    return { elo: 'UNRANKED', puuid }
  }

  const elo = formatLeagueEntry(best)
  return { elo: elo || 'UNRANKED', puuid }
}
