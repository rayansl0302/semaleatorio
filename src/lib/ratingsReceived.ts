import { ref as dbRef, type Database, type DatabaseReference } from 'firebase/database'
import type { UserProfile } from '../types/models'

/** Avaliações recebidas por um jogador: `userRatingsReceived/{toUid}/{fromUid}`. */
export function userRatingsReceivedRef(db: Database, toUid: string): DatabaseReference {
  return dbRef(db, `userRatingsReceived/${toUid}`)
}

export function computeRatingStatsFromReceivedChildren(
  children: Record<string, unknown> | null | undefined,
): { ratingAvg: number; ratingCount: number; semiAleatorio: boolean } {
  if (!children || typeof children !== 'object') {
    return { ratingAvg: 0, ratingCount: 0, semiAleatorio: false }
  }
  let sum = 0
  let n = 0
  for (const v of Object.values(children)) {
    if (v == null || typeof v !== 'object') continue
    const o = v as Record<string, unknown>
    const overall = o.overall
    if (typeof overall !== 'number' || !Number.isFinite(overall)) continue
    sum += overall
    n += 1
  }
  if (n === 0) return { ratingAvg: 0, ratingCount: 0, semiAleatorio: false }
  const ratingAvg = sum / n
  const semiAleatorio = n >= 5 && ratingAvg >= 4.2
  return { ratingAvg, ratingCount: n, semiAleatorio }
}

/** Se existir pelo menos uma entrada em RTDB, usa a média calculada; senão mantém campos do nó `users` (legado). */
export function mergeRatingsIntoProfile(
  p: UserProfile,
  receivedChildren: Record<string, unknown> | null | undefined,
): UserProfile {
  const c = computeRatingStatsFromReceivedChildren(receivedChildren)
  if (c.ratingCount > 0) {
    return {
      ...p,
      ratingAvg: c.ratingAvg,
      ratingCount: c.ratingCount,
      semiAleatorio: c.semiAleatorio,
    }
  }
  return p
}
