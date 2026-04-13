import { onValue, ref } from 'firebase/database'
import { useEffect, useState } from 'react'
import { rtdb } from '../firebase/config'
import type { PlayerListItem, UserProfile } from '../types/models'

type SeedDoc = Omit<UserProfile, 'uid'> & { active?: boolean }

export function useSeedProfiles() {
  const [seeds, setSeeds] = useState<PlayerListItem[]>([])

  useEffect(() => {
    if (!rtdb) {
      setSeeds([])
      return
    }
    const r = ref(rtdb, 'seed_profiles')
    const unsub = onValue(r, (snap) => {
      const list: PlayerListItem[] = []
      snap.forEach((child) => {
        const data = child.val() as SeedDoc
        if (data.active === false) return
        const key = child.key ?? ''
        list.push({
          ...(data as UserProfile),
          uid: `seed_${key}`,
          isSeed: true,
        })
      })
      setSeeds(list)
    })
    return () => unsub()
  }, [])

  return seeds
}
