import { collection, onSnapshot } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { db } from '../firebase/config'
import { eloRank } from '../lib/constants'
import { normalizeUserFromFirestore } from '../lib/firestoreUserProfile'
import {
  fetchRatingAggregatesForUids,
  mergeRatingIntoProfile,
  type RatingAgg,
} from '../lib/ratingsFirestore'
import { isPremiumActive, premiumVariantOf } from '../lib/plan'
import type { UserProfile } from '../types/models'

function tierOf(p: UserProfile): number {
  if (isPremiumActive(p)) {
    return premiumVariantOf(p) === 'complete' ? 3 : 2
  }
  const b = p.boostUntil
  if (b && typeof b.toMillis === 'function' && b.toMillis() > Date.now()) return 1
  return 0
}

function fairHash(uid: string): number {
  let h = 0
  for (let i = 0; i < uid.length; i++) h = ((h << 5) - h + uid.charCodeAt(i)) | 0
  return Math.abs(h)
}

const ROTATION_INTERVAL_MS = 10 * 60_000

function sortPlayers(list: UserProfile[]): UserProfile[] {
  const epoch = Math.floor(Date.now() / ROTATION_INTERVAL_MS)
  return [...list].sort((a, b) => {
    const tierDiff = tierOf(b) - tierOf(a)
    if (tierDiff !== 0) return tierDiff
    if (a.playingNow && !b.playingNow) return -1
    if (b.playingNow && !a.playingNow) return 1
    const ra = a.ratingCount > 0 ? a.ratingAvg : 0
    const rb = b.ratingCount > 0 ? b.ratingAvg : 0
    if (rb !== ra) return rb - ra
    const ea = eloRank(a.elo)
    const eb = eloRank(b.elo)
    if (eb !== ea) return eb - ea
    return ((fairHash(a.uid) + epoch) % 997) - ((fairHash(b.uid) + epoch) % 997)
  })
}

export function usePlayers() {
  const [basePlayers, setBasePlayers] = useState<UserProfile[]>([])
  const [aggByUid, setAggByUid] = useState<Map<string, RatingAgg>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [ratingsTick, setRatingsTick] = useState(0)

  useEffect(() => {
    if (!db) {
      setBasePlayers([])
      return
    }
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list: UserProfile[] = []
        snap.forEach((d) => {
          const p = normalizeUserFromFirestore(d.data(), d.id)
          if (!p || p.shadowBanned || p.adminPanelOnly) return
          list.push(p)
        })
        setBasePlayers(list)
        setError(null)
      },
      (e) => setError(e.message),
    )
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!db) return
    const unsub = onSnapshot(collection(db, 'ratings'), () => {
      setRatingsTick((t) => t + 1)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!db || basePlayers.length === 0) {
      setAggByUid(new Map())
      return
    }
    const uids = basePlayers.map((p) => p.uid)
    let cancelled = false
    fetchRatingAggregatesForUids(db, uids).then((m) => {
      if (!cancelled) setAggByUid(m)
    })
    return () => {
      cancelled = true
    }
  }, [db, basePlayers, ratingsTick])

  const players = useMemo(() => {
    const merged = basePlayers.map((p) =>
      mergeRatingIntoProfile(p, aggByUid.get(p.uid)),
    )
    return sortPlayers(merged)
  }, [basePlayers, aggByUid])

  return { players, error }
}
