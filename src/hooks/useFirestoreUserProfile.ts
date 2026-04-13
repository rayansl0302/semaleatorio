import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase/config'
import { normalizeUserFromFirestore, userProfileDoc } from '../lib/firestoreUserProfile'
import type { UserProfile } from '../types/models'

/** Perfil em `users/{uid}` (leitura pública pelas regras). */
export function useFirestoreUserProfile(uid: string | undefined): UserProfile | null {
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (!db || !uid) {
      setProfile(null)
      return
    }
    const ref = userProfileDoc(db, uid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setProfile(null)
          return
        }
        const p = normalizeUserFromFirestore(snap.data(), uid)
        setProfile(p)
      },
      () => setProfile(null),
    )
    return unsub
  }, [uid])

  return profile
}
