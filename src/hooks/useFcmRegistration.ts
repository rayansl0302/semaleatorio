import { arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore'
import { useEffect, useRef } from 'react'
import { app as firebaseApp, db } from '../firebase/config'
import { requestFcmToken } from '../firebase/messaging'
import type { User } from 'firebase/auth'

const VAPID = import.meta.env.VITE_FCM_VAPID_KEY as string | undefined

function tokenList(v: unknown): string[] {
  if (v == null) return []
  if (Array.isArray(v)) return v.map((x) => String(x))
  return []
}

/**
 * Registra token FCM no perfil (Firestore, `users.fcmTokens`) para notificações.
 */
export function useFcmRegistration(user: User | null) {
  const done = useRef(false)

  useEffect(() => {
    if (!user || !db || !firebaseApp || !VAPID || done.current) return
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
  }, [user])
}
