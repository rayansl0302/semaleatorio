import { onValue, ref } from 'firebase/database'
import { useEffect, useMemo, useState } from 'react'
import { rtdb } from '../firebase/config'
import { eloRank } from '../lib/constants'
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
  const [raw, setRaw] = useState<UserProfile[]>([])
  const [error, setError] = useState<string | null>(null)

  const players = useMemo(() => sortPlayers(raw), [raw])

  useEffect(() => {
    if (!rtdb) {
      setRaw([])
      return
    }
    const r = ref(rtdb, 'users')
    const unsub = onValue(
      r,
      (snap) => {
        const list: UserProfile[] = []
        snap.forEach((child) => {
          const uid = child.key ?? ''
          const p = normalizeUserFromRtdb(child.val(), uid)
          if (p && !p.shadowBanned) list.push(p)
        })
        setRaw(list)
        setError(null)
      },
      (e) => setError(e.message),
    )
    return () => unsub()
  }, [])

  return { players, error }
}
