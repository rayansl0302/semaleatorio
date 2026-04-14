import { arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore'
import { useEffect, useRef } from 'react'
import { app as firebaseApp, db } from '../firebase/config'
import { requestFcmToken } from '../firebase/messaging'
import type { User } from 'firebase/auth'
import { hasPremiumCompleteFeatures } from '../lib/plan'
import type { UserProfile } from '../types/models'

const VAPID = import.meta.env.VITE_FCM_VAPID_KEY as string | undefined

function tokenList(v: unknown): string[] {
  if (v == null) return []
  if (Array.isArray(v)) return v.map((x) => String(x))
  return []
}

/**
 * Regista token FCM no perfil (Firestore, `users.fcmTokens`) para notificações.
 * Só utilizadores com **Premium Completo** (29,90) — inclui legado sem `premiumVariant`.
 */
export function useFcmRegistration(user: User | null, profile: UserProfile | null) {
  const done = useRef(false)

  useEffect(() => {
    if (!hasPremiumCompleteFeatures(profile) || !user || !db || !firebaseApp || !VAPID || done.current)
      return
    let cancelled = false
    ;(async () => {
      const token = await requestFcmToken(firebaseApp, VAPID)
      if (cancelled || !token) return
      try {
        const pref = doc(db, 'users', user.uid)
        const snap = await getDoc(pref)
        const cur = tokenList(snap.exists() ? snap.data()?.fcmTokens : undefined)
        if (cur.includes(token)) {
          done.current = true
          return
        }
        await updateDoc(pref, { fcmTokens: arrayUnion(token) })
        done.current = true
      } catch {
        /* permissão negada ou regras */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, profile])
}
