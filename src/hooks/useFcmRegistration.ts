import { get, update } from 'firebase/database'
import { useEffect, useRef } from 'react'
import { app as firebaseApp, rtdb } from '../firebase/config'
import { requestFcmToken } from '../firebase/messaging'
import { readRtdbStringList, userProfileRef } from '../lib/rtdbUserProfile'
import type { User } from 'firebase/auth'

const VAPID = import.meta.env.VITE_FCM_VAPID_KEY as string | undefined

/**
 * Registra token FCM no perfil (Realtime Database) para notificações.
 */
export function useFcmRegistration(user: User | null) {
  const done = useRef(false)

  useEffect(() => {
    if (!user || !rtdb || !firebaseApp || !VAPID || done.current) return
    let cancelled = false
    ;(async () => {
      const token = await requestFcmToken(firebaseApp, VAPID)
      if (cancelled || !token) return
      try {
        const pref = userProfileRef(rtdb, user.uid)
        const snap = await get(pref)
        const raw = snap.exists()
          ? (snap.val() as Record<string, unknown>).fcmTokens
          : undefined
        const cur = readRtdbStringList(raw)
        if (cur.includes(token)) {
          done.current = true
          return
        }
        await update(pref, { fcmTokens: [...cur, token] })
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
