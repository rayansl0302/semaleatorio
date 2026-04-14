import type { Timestamp } from 'firebase/firestore'

export type QueueType = 'duo' | 'flex' | 'clash'
export type PlayerStatus = 'LFG' | 'PLAYING' | 'OFFLINE'
export type Plan = 'free' | 'premium'

/** Com `plan: premium`: essencial (R$ 19,90) vs completo (R$ 29,90). Legado sem campo = tratado como completo. */
export type PremiumVariant = 'essential' | 'complete'

export interface UserProfile {
  uid: string
  nickname: string
  tag: string
  elo: string
  roles: string[]
  status: PlayerStatus
  bio: string
  ratingAvg: number
  ratingCount: number
  lastOnline: Timestamp | null
  plan: Plan
  /** Só relevante com plano premium ativo. */
  premiumVariant?: PremiumVariant | null
  semiAleatorio: boolean
  playerTags: string[]
  queueTypes: QueueType[]
  favoriteUids: string[]
  boostUntil: Timestamp | null
  riotPuuid?: string
  playingNow?: boolean
  createdAt?: Timestamp | null
  /** URL pública /u/:profileSlug */
  profileSlug?: string
  region?: string
  shadowBanned?: boolean
  reportsCount?: number
  /** Premium válido até (null = sem expiração / legado) */
  premiumUntil?: Timestamp | null
  cpf?: string
  asaasCustomerId?: string
  fcmTokens?: string[]
  /**
   * Conta só para o painel /admin: esconde o perfil do mural, mensagens, feed e /u/…
   * Sincronizado com `admins/{uid}` (regras Firestore impedem marcar sem doc em admins).
   */
  adminPanelOnly?: boolean
}

/** Card de exemplo quando a base ainda é pequena */
export type PlayerListItem = UserProfile & { isSeed?: boolean }

export interface PostDoc {
  id: string
  uid: string
  title: string
  description: string
  eloMin: string
  role: string
  queueType: QueueType
  createdAt: Timestamp | null
}

export interface MessageDoc {
  id: string
  threadId?: string
  fromUid: string
  toUid: string
  text: string
  createdAt: Timestamp | null
}

export interface RatingInput {
  communication: number
  skill: number
  toxicity: number
}
