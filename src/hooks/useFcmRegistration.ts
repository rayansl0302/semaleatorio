import { arrayUnion, doc, updateDoc } from 'firebase/firestore'
import { useEffect, useRef } from 'react'
import { db, app as firebaseApp } from '../firebase/config'
import { requestFcmToken } from '../firebase/messaging'
import type { User } from 'firebase/auth'

const VAPID = import.meta.env.VITE_FCM_VAPID_KEY as string | undefined

/**
 * Registra token FCM no perfil para notificações (retention).
 * Dispare envios server-side com Admin SDK (ex.: quando um post compatível aparece).
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
        await updateDoc(doc(db, 'users', user.uid), {
          fcmTokens: arrayUnion(token),
        })
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
