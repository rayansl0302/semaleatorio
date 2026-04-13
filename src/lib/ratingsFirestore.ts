import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore'
import type { UserProfile } from '../types/models'

export type RatingAgg = {
  ratingAvg: number
  ratingCount: number
  semiAleatorio: boolean
}

export function emptyRatingAgg(): RatingAgg {
  return { ratingAvg: 0, ratingCount: 0, semiAleatorio: false }
}

export function aggregateFromOverallValues(overalls: number[]): RatingAgg {
  if (overalls.length === 0) return emptyRatingAgg()
  const sum = overalls.reduce((a, b) => a + b, 0)
  const count = overalls.length
  const ratingAvg = sum / count
  return {
    ratingAvg,
    ratingCount: count,
    semiAleatorio: count >= 5 && ratingAvg >= 4.2,
  }
}

function computeAgg(overalls: number[]): RatingAgg {
  if (overalls.length === 0) return emptyRatingAgg()
  const sum = overalls.reduce((a, b) => a + b, 0)
  const count = overalls.length
  const ratingAvg = sum / count
  return {
    ratingAvg,
    ratingCount: count,
    semiAleatorio: count >= 5 && ratingAvg >= 4.2,
  }
}

/** Agrega todas as notas em `ratings` onde `toUid` está na lista (chunks de 30 no `in`). */
export async function fetchRatingAggregatesForUids(
  fs: Firestore,
  uids: string[],
): Promise<Map<string, RatingAgg>> {
  const out = new Map<string, RatingAgg>()
  if (uids.length === 0) return out
  const uniq = [...new Set(uids)]
  const col = collection(fs, 'ratings')
  const CHUNK = 30
  for (let i = 0; i < uniq.length; i += CHUNK) {
    const chunk = uniq.slice(i, i + CHUNK)
    const q = query(col, where('toUid', 'in', chunk))
    const snap = await getDocs(q)
    const byTo = new Map<string, number[]>()
    snap.forEach((d) => {
      const data = d.data() as { toUid?: string; overall?: number }
      const t = data.toUid
      if (!t) return
      const o = typeof data.overall === 'number' ? data.overall : 0
      const arr = byTo.get(t) ?? []
      arr.push(o)
      byTo.set(t, arr)
    })
    for (const uid of chunk) {
      out.set(uid, computeAgg(byTo.get(uid) ?? []))
    }
  }
  return out
}

export async function fetchRatingAggregateForUid(
  fs: Firestore,
  toUid: string,
): Promise<RatingAgg> {
  const m = await fetchRatingAggregatesForUids(fs, [toUid])
  return m.get(toUid) ?? emptyRatingAgg()
}

/** Sobrescreve média/selo com dados agregados de `ratings` (fonte de verdade no cliente). */
export function mergeRatingIntoProfile(
  p: UserProfile,
  agg: RatingAgg | undefined,
): UserProfile {
  if (!agg || agg.ratingCount === 0) return p
  return {
    ...p,
    ratingAvg: agg.ratingAvg,
    ratingCount: agg.ratingCount,
    semiAleatorio: agg.semiAleatorio,
  }
}

export async function submitRatingToFirestore(
  fs: Firestore,
  params: {
    fromUid: string
    toUid: string
    communication: number
    skill: number
    toxicity: number
  },
): Promise<void> {
  const { fromUid, toUid, communication, skill, toxicity } = params
  if (fromUid === toUid) throw new Error('Alvo inválido.')
  if (
    ![communication, skill, toxicity].every(
      (n) => Number.isInteger(n) && n >= 1 && n <= 5,
    )
  ) {
    throw new Error('Notas entre 1 e 5.')
  }
  const id = `${fromUid}__${toUid}`
  const ref = doc(fs, 'ratings', id)
  const existing = await getDoc(ref)
  if (existing.exists()) throw new Error('Já avaliaste este jogador.')
  const overall = (communication + skill + (6 - toxicity)) / 3
  await setDoc(ref, {
    fromUid,
    toUid,
    communication,
    skill,
    toxicity,
    overall,
    createdAt: serverTimestamp(),
  })
}
