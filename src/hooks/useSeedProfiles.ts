import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase/config'
import type { PlayerListItem, UserProfile } from '../types/models'

type SeedDoc = Omit<UserProfile, 'uid'> & { active?: boolean }

export function useSeedProfiles() {
  const [seeds, setSeeds] = useState<PlayerListItem[]>([])

  useEffect(() => {
    if (!db) {
      setSeeds([])
      return
    }
    const col = collection(db, 'seed_profiles')
    let unsub: Unsubscribe | undefined
    try {
      unsub = onSnapshot(col, (snap) => {
        const list: PlayerListItem[] = []
        snap.forEach((d) => {
          const data = d.data() as SeedDoc
          if (data.active === false) return
          list.push({
            ...(data as UserProfile),
            uid: `seed_${d.id}`,
            isSeed: true,
          })
        })
        setSeeds(list)
      })
    } catch {
      setSeeds([])
    }
    return () => unsub?.()
  }, [])

  return seeds
}
