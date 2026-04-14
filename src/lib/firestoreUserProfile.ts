import {
  doc,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore'
import { profileSlugFromNick } from './profileSlug'
import type { Plan, PlayerStatus, PremiumVariant, QueueType, UserProfile } from '../types/models'

const QUEUE_TYPE_SET = new Set<string>(['duo', 'flex', 'clash'])

function readStringList(v: unknown): string[] {
  if (v == null) return []
  if (Array.isArray(v)) return v.map((x) => String(x))
  return []
}

function readQueueTypes(v: unknown): QueueType[] {
  return readStringList(v).filter((x): x is QueueType => QUEUE_TYPE_SET.has(x))
}

function readPlayerStatus(v: unknown): PlayerStatus {
  if (v === 'PLAYING' || v === 'OFFLINE' || v === 'LFG') return v
  return 'LFG'
}

function readPremiumVariant(v: unknown): PremiumVariant | undefined {
  if (v === 'essential' || v === 'complete') return v
  return undefined
}

function asTimestamp(v: unknown): Timestamp | null {
  if (v == null) return null
  if (v instanceof Timestamp) return v
  if (
    typeof v === 'object' &&
    v !== null &&
    'toMillis' in v &&
    typeof (v as Timestamp).toMillis === 'function'
  ) {
    return v as Timestamp
  }
  return null
}

export function userProfileDoc(
  fs: Firestore,
  uid: string,
): DocumentReference<DocumentData> {
  return doc(fs, 'users', uid)
}

export function profileSlugIndexDoc(fs: Firestore, slug: string) {
  return doc(fs, 'profileSlugIndex', slug.toLowerCase())
}

export function normalizeUserFromFirestore(
  data: DocumentData | undefined,
  uid: string,
): UserProfile | null {
  if (!data || typeof data !== 'object') return null

  const nickname = String(data.nickname ?? 'Invocador')
  const tag = String(data.tag ?? 'BR1')
  const slug =
    typeof data.profileSlug === 'string' && data.profileSlug.trim() !== ''
      ? data.profileSlug.trim()
      : profileSlugFromNick(nickname, tag)

  const roles = readStringList(data.roles)
  const queueTypesRaw = readQueueTypes(data.queueTypes)
  const playerTags = readStringList(data.playerTags)
  const favoriteUids = readStringList(data.favoriteUids)
  const fcmList = readStringList(data.fcmTokens)
  const fcmTokens = fcmList.length > 0 ? fcmList : undefined

  const premiumUntilTs = asTimestamp(data.premiumUntil)
  const premiumExpired =
    data.plan === 'premium' &&
    (premiumUntilTs == null ||
      (typeof premiumUntilTs.toMillis === 'function' && premiumUntilTs.toMillis() <= Date.now()))
  const boostUntilTs = asTimestamp(data.boostUntil)
  const boostExpired =
    boostUntilTs != null &&
    typeof boostUntilTs.toMillis === 'function' &&
    boostUntilTs.toMillis() <= Date.now()

  return {
    uid,
    nickname,
    tag,
    elo: typeof data.elo === 'string' && data.elo.trim() !== '' ? data.elo.trim() : 'UNRANKED',
    roles,
    status: readPlayerStatus(data.status),
    bio: typeof data.bio === 'string' ? data.bio : '',
    ratingAvg: typeof data.ratingAvg === 'number' ? data.ratingAvg : 0,
    ratingCount: typeof data.ratingCount === 'number' ? data.ratingCount : 0,
    lastOnline: asTimestamp(data.lastOnline),
    plan: data.plan === 'premium' && !premiumExpired ? 'premium' : 'free',
    premiumVariant: premiumExpired ? undefined : readPremiumVariant(data.premiumVariant),
    semiAleatorio: Boolean(data.semiAleatorio),
    playerTags,
    queueTypes:
      queueTypesRaw.length > 0
        ? queueTypesRaw
        : (['duo', 'flex', 'clash'] as QueueType[]),
    favoriteUids,
    boostUntil: boostExpired ? null : boostUntilTs,
    riotPuuid: typeof data.riotPuuid === 'string' ? data.riotPuuid : undefined,
    playingNow: Boolean(data.playingNow),
    createdAt: asTimestamp(data.createdAt),
    profileSlug: slug,
    region: typeof data.region === 'string' ? data.region : undefined,
    shadowBanned: Boolean(data.shadowBanned),
    reportsCount: typeof data.reportsCount === 'number' ? data.reportsCount : undefined,
    premiumUntil: premiumExpired ? null : premiumUntilTs,
    asaasCustomerId:
      typeof data.asaasCustomerId === 'string' ? data.asaasCustomerId : undefined,
    cpf: typeof data.cpf === 'string' ? data.cpf : undefined,
    fcmTokens,
    adminPanelOnly: Boolean(data.adminPanelOnly),
  }
}

function omitUndefinedRecord(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

/** Documento inicial em `users/{uid}` (Firestore). */
export function initialUserFirestorePayload(p: UserProfile): Record<string, unknown> {
  return omitUndefinedRecord({
    uid: p.uid,
    nickname: p.nickname,
    tag: p.tag,
    elo: p.elo,
    roles: p.roles,
    status: p.status,
    bio: p.bio,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    lastOnline: serverTimestamp(),
    plan: p.plan as Plan,
    semiAleatorio: p.semiAleatorio,
    playerTags: p.playerTags,
    queueTypes: p.queueTypes,
    favoriteUids: p.favoriteUids,
    boostUntil: null,
    playingNow: p.playingNow ?? false,
    region: p.region,
    profileSlug: p.profileSlug ?? profileSlugFromNick(p.nickname, p.tag),
    shadowBanned: p.shadowBanned ?? false,
    createdAt: serverTimestamp(),
  })
}
