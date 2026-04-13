import {
  ref as dbRef,
  serverTimestamp,
  type Database,
  type DatabaseReference,
} from 'firebase/database'
import { Timestamp } from 'firebase/firestore'
import { profileSlugFromNick } from './profileSlug'
import type { Plan, PlayerStatus, QueueType, UserProfile } from '../types/models'

export function userProfileRef(db: Database, uid: string): DatabaseReference {
  return dbRef(db, `users/${uid}`)
}

export function profileSlugIndexRef(db: Database, slug: string): DatabaseReference {
  return dbRef(db, `profileSlugIndex/${slug.toLowerCase()}`)
}

function millisToTimestamp(v: unknown): Timestamp | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  return Timestamp.fromMillis(v)
}

const QUEUE_TYPE_SET = new Set<string>(['duo', 'flex', 'clash'])

/** RTDB pode devolver listas como `{ "0": a, "1": b }` em vez de array. */
export function readRtdbStringList(v: unknown): string[] {
  if (v == null) return []
  if (Array.isArray(v)) return v.map((x) => String(x))
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    return Object.keys(o)
      .filter((k) => /^\d+$/.test(k))
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => String(o[k] ?? ''))
  }
  return []
}

function readRtdbQueueTypes(v: unknown): QueueType[] {
  return readRtdbStringList(v).filter((x): x is QueueType =>
    QUEUE_TYPE_SET.has(x),
  )
}

function readPlayerStatus(v: unknown): PlayerStatus {
  if (v === 'PLAYING' || v === 'OFFLINE' || v === 'LFG') return v
  return 'LFG'
}

export function normalizeUserFromRtdb(raw: unknown, uid: string): UserProfile | null {
  if (raw == null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const nickname = String(o.nickname ?? 'Invocador')
  const tag = String(o.tag ?? 'BR1')
  const slug =
    (typeof o.profileSlug === 'string' && o.profileSlug.trim() !== ''
      ? o.profileSlug
      : profileSlugFromNick(nickname, tag)) || profileSlugFromNick(nickname, tag)

  const roles = readRtdbStringList(o.roles)
  const queueTypesRaw = readRtdbQueueTypes(o.queueTypes)
  const playerTags = readRtdbStringList(o.playerTags)
  const favoriteUids = readRtdbStringList(o.favoriteUids)
  const fcmList = readRtdbStringList(o.fcmTokens)
  const fcmTokens = fcmList.length > 0 ? fcmList : undefined

  return {
    uid,
    nickname,
    tag,
    elo: typeof o.elo === 'string' && o.elo.trim() !== '' ? o.elo.trim() : 'UNRANKED',
    roles,
    status: readPlayerStatus(o.status),
    bio: typeof o.bio === 'string' ? o.bio : '',
    ratingAvg: typeof o.ratingAvg === 'number' ? o.ratingAvg : 0,
    ratingCount: typeof o.ratingCount === 'number' ? o.ratingCount : 0,
    lastOnline: millisToTimestamp(o.lastOnline),
    plan: o.plan === 'premium' ? 'premium' : 'free',
    semiAleatorio: Boolean(o.semiAleatorio),
    playerTags,
    queueTypes:
      queueTypesRaw.length > 0
        ? queueTypesRaw
        : (['duo', 'flex', 'clash'] as QueueType[]),
    favoriteUids,
    boostUntil: millisToTimestamp(o.boostUntil),
    riotPuuid: typeof o.riotPuuid === 'string' ? o.riotPuuid : undefined,
    playingNow: Boolean(o.playingNow),
    createdAt: millisToTimestamp(o.createdAt),
    profileSlug: slug,
    region: typeof o.region === 'string' ? o.region : undefined,
    shadowBanned: Boolean(o.shadowBanned),
    reportsCount: typeof o.reportsCount === 'number' ? o.reportsCount : undefined,
    premiumUntil: millisToTimestamp(o.premiumUntil),
    asaasCustomerId: typeof o.asaasCustomerId === 'string' ? o.asaasCustomerId : undefined,
    fcmTokens,
  }
}

export function initialUserPayloadForRtdb(p: UserProfile): Record<string, unknown> {
  return {
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
  }
}
