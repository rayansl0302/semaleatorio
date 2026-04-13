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
import { isPremiumActive } from '../lib/plan'
import type { UserProfile } from '../types/models'

function boostScore(p: UserProfile): number {
  const b = p.boostUntil
  if (!b || typeof b.toMillis !== 'function') return 0
  return b.toMillis() > Date.now() ? b.toMillis() : 0
}

function sortPlayers(list: UserProfile[]): UserProfile[] {
  return [...list].sort((a, b) => {
    const boostDiff = boostScore(b) - boostScore(a)
    if (boostDiff !== 0) return boostDiff
    const pa = isPremiumActive(a)
    const pb = isPremiumActive(b)
    if (pa && !pb) return -1
    if (pb && !pa) return 1
    if (a.playingNow && !b.playingNow) return -1
    if (b.playingNow && !a.playingNow) return 1
    const ra = a.ratingCount > 0 ? a.ratingAvg : 0
    const rb = b.ratingCount > 0 ? b.ratingAvg : 0
    if (rb !== ra) return rb - ra
    return eloRank(b.elo) - eloRank(a.elo)
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
          if (!p || p.shadowBanned) return
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
