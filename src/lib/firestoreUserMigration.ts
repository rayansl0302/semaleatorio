import type { User } from 'firebase/auth'
import type { Database } from 'firebase/database'
import { get, serverTimestamp, set, update } from 'firebase/database'
import type { DocumentData } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { doc, getDoc } from 'firebase/firestore'
import {
  initialUserPayloadForRtdb,
  normalizeUserFromRtdb,
  profileSlugIndexRef,
  userProfileRef,
} from './rtdbUserProfile'
import { profileSlugFromNick } from './profileSlug'
import type { UserProfile } from '../types/models'

function timestampToMillis(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'object' && v !== null && 'toMillis' in v) {
    const fn = (v as { toMillis: () => number }).toMillis
    if (typeof fn === 'function') return fn.call(v)
  }
  return null
}

function omitUndefined(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

/** Converte documento Firestore para chaves compatíveis com o normalizador RTDB. */
export function firestoreUserDocAsRtdbPlain(data: DocumentData): Record<string, unknown> {
  const o: Record<string, unknown> = { ...data }
  for (const k of ['lastOnline', 'createdAt', 'boostUntil', 'premiumUntil'] as const) {
    const ms = timestampToMillis(o[k])
    if (ms != null) o[k] = ms
    else if (o[k] != null && typeof o[k] === 'object' && 'toMillis' in (o[k] as object)) {
      const m = timestampToMillis(o[k])
      if (m != null) o[k] = m
    }
  }
  return o
}

/** Perfil “casca” criado no RTDB — tentamos importar dados reais do Firestore. */
export function isLikelyEmptyShellProfile(p: UserProfile): boolean {
  return (
    p.nickname === 'Invocador' &&
    p.tag === 'BR1' &&
    !p.riotPuuid &&
    p.ratingCount === 0 &&
    (!p.bio || p.bio.trim() === '') &&
    p.elo === 'UNRANKED'
  )
}

async function writeSlugIndex(rtdb: Database, uid: string, plain: Record<string, unknown>) {
  const nick = String(plain.nickname ?? 'invocador')
  const tag = String(plain.tag ?? 'br1')
  const slug =
    typeof plain.profileSlug === 'string' && plain.profileSlug.trim() !== ''
      ? plain.profileSlug.trim()
      : profileSlugFromNick(nick, tag)
  await set(profileSlugIndexRef(rtdb, slug), { uid })
}

/** Erros de rede / offline em que não vale a pena alarmar o utilizador. */
export function isIgnorableFirestoreMigrationError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const err = e as { code?: string; message?: string; name?: string }
  const code = String(err.code ?? '')
  const msg = String(err.message ?? '').toLowerCase()
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'cancelled' ||
    msg.includes('offline') ||
    msg.includes('failed to get document') ||
    msg.includes('network') ||
    msg.includes('fetch')
  )
}

/**
 * Tenta migração com limite de tempo — não bloqueia a UI indefinidamente.
 * Se o prazo expirar, devolve `false` (pode haver sync ainda a correr em background).
 */
export async function tryFirestoreMigrationWithTimeout(
  fs: Firestore,
  rtdb: Database,
  u: User,
  timeoutMs: number,
): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false
  try {
    return await Promise.race([
      syncUserProfileFromFirestoreIfNeeded(fs, rtdb, u),
      new Promise<boolean>((resolve) => {
        globalThis.setTimeout(() => resolve(false), timeoutMs)
      }),
    ])
  } catch (e) {
    if (isIgnorableFirestoreMigrationError(e)) return false
    console.warn('[auth] Migração Firestore → RTDB:', e)
    return false
  }
}

/** Atualiza perfil “casca” a partir do Firestore sem bloquear o login (segundo plano). */
export function scheduleFirestoreShellSync(
  fs: Firestore,
  rtdb: Database,
  u: User,
): void {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  void (async () => {
    try {
      await syncUserProfileFromFirestoreIfNeeded(fs, rtdb, u)
    } catch (e) {
      if (!isIgnorableFirestoreMigrationError(e)) {
        console.warn('[auth] Migração Firestore → RTDB (fundo):', e)
      }
    }
  })()
}

/**
 * Se existir `users/{uid}` no Firestore, sincroniza com o RTDB.
 * Útil quando o utilizador tinha dados no Firestore e o RTDB ficou vazio ou só com Invocador#BR1.
 */
export async function syncUserProfileFromFirestoreIfNeeded(
  fs: Firestore,
  rtdb: Database,
  u: User,
): Promise<boolean> {
  const fsRef = doc(fs, 'users', u.uid)
  const fsSnap = await getDoc(fsRef)
  if (!fsSnap.exists()) return false

  const plain = omitUndefined(firestoreUserDocAsRtdbPlain(fsSnap.data()))
  delete plain.uid

  const fromFs = normalizeUserFromRtdb(plain, u.uid)
  if (!fromFs) return false

  const pref = userProfileRef(rtdb, u.uid)
  const rtdbSnap = await get(pref)

  if (!rtdbSnap.exists()) {
    const payload: Record<string, unknown> = {
      ...initialUserPayloadForRtdb(fromFs),
    }
    if (typeof plain.createdAt === 'number') payload.createdAt = plain.createdAt
    await set(pref, payload)
    await writeSlugIndex(rtdb, u.uid, { ...plain, nickname: fromFs.nickname, tag: fromFs.tag })
    return true
  }

  const current = normalizeUserFromRtdb(rtdbSnap.val(), u.uid)
  if (!current || !isLikelyEmptyShellProfile(current)) return false

  await update(pref, {
    ...plain,
    lastOnline: serverTimestamp(),
  })
  await writeSlugIndex(rtdb, u.uid, { ...plain, nickname: fromFs.nickname, tag: fromFs.tag })
  return true
}
