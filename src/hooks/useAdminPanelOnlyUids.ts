import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase/config'

/** UIDs com `users.adminPanelOnly == true` (contas só do painel administrativo). */
export function useAdminPanelOnlyUids(): ReadonlySet<string> {
  const [uids, setUids] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    if (!db) {
      setUids(new Set())
      return
    }
    const q = query(collection(db, 'users'), where('adminPanelOnly', '==', true))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = new Set<string>()
        snap.forEach((d) => next.add(d.id))
        setUids(next)
      },
      () => setUids(new Set()),
    )
    return () => unsub()
  }, [])

  return uids
}
