export const ELO_ORDER = [
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
  'UNRANKED',
] as const

export const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'] as const

export const PLAYER_TAG_OPTIONS = ['Sem Tilt', 'Tryhard', 'Casual'] as const

export const QUEUE_LABELS: Record<string, string> = {
  duo: 'Duo ranqueada',
  flex: 'Flex',
  clash: 'Clash',
}

export const STATUS_LABELS: Record<string, string> = {
  LFG: 'Procurando time ou dupla',
  PLAYING: 'Em partida',
  OFFLINE: 'Offline',
}

/** Rótulo do filtro “disponível para jogar agora” (sem usar a sigla LFG na UI). */
export const LOOKING_FOR_MATCH_FILTER_LABEL =
  'Só quem está procurando time ou dupla agora'

/** Explicação curta para o filtro acima. */
export const LOOKING_FOR_MATCH_FILTER_HELP =
  'Mostra perfis que marcam que querem encontrar parceiro ou time para subir fila (duo, flex, Clash) neste momento.'

/** Tooltip do bloco «Jogadores · presença» no feed (ordenação por atividade no app). */
export const PRESENCE_SIDEBAR_TOOLTIP =
  'Ordenados pela última vez que o app registrou atividade (não é status do cliente da Riot).'

/** Nomes das ligas em PT-BR (valor armazenado continua em inglês). */
export const ELO_TIER_LABELS: Record<string, string> = {
  IRON: 'Ferro',
  BRONZE: 'Bronze',
  SILVER: 'Prata',
  GOLD: 'Ouro',
  PLATINUM: 'Platina',
  EMERALD: 'Esmeralda',
  DIAMOND: 'Diamante',
  MASTER: 'Mestre',
  GRANDMASTER: 'Grão-mestre',
  CHALLENGER: 'Desafiante',
  UNRANKED: 'Sem elo',
}

export const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  TOP: 'Topo',
  JUNGLE: 'Selva',
  MID: 'Meio',
  ADC: 'Atirador',
  SUPPORT: 'Suporte',
}

export const PLAYER_TAG_LABELS: Record<string, string> = {
  'Sem Tilt': 'Sem tilt',
  Tryhard: 'Competitivo',
  Casual: 'Casual',
}

export const FREE_FAVORITES_LIMIT = 5

export function eloTierLabel(tier: string): string {
  const t = tier.trim().split(/\s+/)[0]?.toUpperCase() ?? 'UNRANKED'
  return ELO_TIER_LABELS[t] ?? tier
}

/** Ex.: `GOLD II` → `Ouro II`; apenas tier → `Ouro`. */
export function formatEloDisplay(elo: string | null | undefined): string {
  const s = elo?.trim()
  if (!s) return ELO_TIER_LABELS.UNRANKED
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ELO_TIER_LABELS.UNRANKED
  const tier = parts[0].toUpperCase()
  const tierPt = ELO_TIER_LABELS[tier] ?? parts[0]
  if (parts.length === 1) return tierPt
  return `${tierPt} ${parts.slice(1).join(' ')}`
}

export function roleLabel(role: string | undefined | null): string {
  if (!role) return ''
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role
}

export function playerTagLabel(tag: string): string {
  return PLAYER_TAG_LABELS[tag] ?? tag
}

export function eloRank(elo: string | undefined | null): number {
  const s = elo == null || typeof elo !== 'string' ? '' : elo.trim()
  const base = s.split(' ')[0]?.toUpperCase() ?? 'UNRANKED'
  const idx = ELO_ORDER.indexOf(base as (typeof ELO_ORDER)[number])
  return idx === -1 ? ELO_ORDER.length : idx
}
