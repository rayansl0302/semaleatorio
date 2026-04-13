import { collection, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase/config'
import { normalizeUserFromFirestore } from '../lib/firestoreUserProfile'
import type { PlayerListItem } from '../types/models'

export function useSeedProfiles() {
  const [seeds, setSeeds] = useState<PlayerListItem[]>([])

  useEffect(() => {
    if (!db) {
      setSeeds([])
      return
    }
    const unsub = onSnapshot(collection(db, 'seed_profiles'), (snap) => {
      const list: PlayerListItem[] = []
      snap.forEach((d) => {
        const p = normalizeUserFromFirestore(d.data(), d.id)
        if (p) list.push({ ...p, isSeed: true })
      })
      setSeeds(list)
    })
    return () => unsub()
  }, [])

  return seeds
}
