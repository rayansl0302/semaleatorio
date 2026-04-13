import { onValue, ref } from 'firebase/database'
import { useEffect, useMemo, useState } from 'react'
import { rtdb } from '../firebase/config'
import { eloRank } from '../lib/constants'
import { mergeRatingsIntoProfile } from '../lib/ratingsReceived'
import { normalizeUserFromRtdb } from '../lib/rtdbUserProfile'
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
  const [usersMap, setUsersMap] = useState<Record<string, unknown> | null>(null)
  const [receivedMap, setReceivedMap] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const raw = useMemo(() => {
    if (!usersMap) return []
    const list: UserProfile[] = []
    for (const [uid, val] of Object.entries(usersMap)) {
      const p = normalizeUserFromRtdb(val, uid)
      if (!p || p.shadowBanned) continue
      const sub = receivedMap?.[uid]
      const children =
        sub != null && typeof sub === 'object'
          ? (sub as Record<string, unknown>)
          : undefined
      list.push(mergeRatingsIntoProfile(p, children))
    }
    return list
  }, [usersMap, receivedMap])

  const players = useMemo(() => sortPlayers(raw), [raw])

  useEffect(() => {
    if (!rtdb) {
      setUsersMap(null)
      setReceivedMap(null)
      return
    }
    const ur = ref(rtdb, 'users')
    const rr = ref(rtdb, 'userRatingsReceived')
    const unsubU = onValue(
      ur,
      (snap) => {
        setUsersMap(snap.exists() ? (snap.val() as Record<string, unknown>) : null)
        setError(null)
      },
      (e) => setError(e.message),
    )
    const unsubR = onValue(
      rr,
      (snap) => {
        setReceivedMap(snap.exists() ? (snap.val() as Record<string, unknown>) : null)
      },
      (e) => setError(e.message),
    )
    return () => {
      unsubU()
      unsubR()
    }
  }, [])

  return { players, error }
}
