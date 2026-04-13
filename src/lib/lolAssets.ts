import { ELO_ORDER, ROLES } from './constants'

type EloTier = (typeof ELO_ORDER)[number]

/** Pasta em `public` com espaço no nome — use sempre encoded na URL. */
export const LOL_LANE_ICONS_BASE = '/icons%20-lane'

export const LOL_ELO_ICONS_BASE = '/icons-elo'

type Role = (typeof ROLES)[number]

const ROLE_FILENAME: Record<Role, string> = {
  TOP: 'top.png',
  JUNGLE: 'jungle.png',
  MID: 'mid.png',
  ADC: 'adc.png',
  SUPPORT: 'suporte.png',
}

/** Arquivos em `public/icons-elo/`. */
const ELO_FILENAME: Partial<Record<EloTier, string>> = {
  IRON: '7574-iron.png',
  BRONZE: '1184-bronze.png',
  SILVER: '7455-silver.png',
  GOLD: '1053-gold.png',
  PLATINUM: '3978-platinum.png',
  EMERALD: 'esmeralda.png',
  DIAMOND: '1053-diamond.png',
  MASTER: '9231-master.png',
  GRANDMASTER: '9476-grandmaster.png',
  CHALLENGER: '9476-challenger.png',
}

export function roleIconSrc(role: string | undefined | null): string | undefined {
  if (role == null || typeof role !== 'string') return undefined
  const r = role.trim().toUpperCase() as Role
  if (!r) return undefined
  const file = ROLE_FILENAME[r]
  if (!file) return undefined
  return `${LOL_LANE_ICONS_BASE}/${file}`
}

/** Primeira palavra do elo (ex.: "GOLD I" → "GOLD"). */
export function eloTierKey(elo: string | undefined | null): string {
  const s = elo == null || typeof elo !== 'string' ? '' : elo.trim()
  const first = s.split(/\s+/)[0]
  return first ? first.toUpperCase() : 'UNRANKED'
}

export function eloIconSrc(elo: string | undefined | null): string | undefined {
  const tier = eloTierKey(elo) as EloTier
  const file = ELO_FILENAME[tier]
  if (!file) return undefined
  return `${LOL_ELO_ICONS_BASE}/${file}`
}
