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
  duo: 'Duo',
  flex: 'Flex',
  clash: 'Clash',
}

export const STATUS_LABELS: Record<string, string> = {
  LFG: 'Procurando time',
  PLAYING: 'Em partida',
  OFFLINE: 'Offline',
}

export const FREE_FAVORITES_LIMIT = 5

export function eloRank(elo: string): number {
  const base = elo.split(' ')[0]?.toUpperCase() ?? 'UNRANKED'
  const idx = ELO_ORDER.indexOf(base as (typeof ELO_ORDER)[number])
  return idx === -1 ? ELO_ORDER.length : idx
}
