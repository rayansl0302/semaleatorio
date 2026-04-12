import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import type { FirebaseApp } from 'firebase/app'

let messagingPromise: Promise<ReturnType<typeof getMessaging> | null> | null = null

export function getMessagingIfSupported(app: FirebaseApp) {
  if (!messagingPromise) {
    messagingPromise = isSupported().then((ok) =>
      ok ? getMessaging(app) : null,
    )
  }
  return messagingPromise
}

export async function requestFcmToken(
  app: FirebaseApp,
  vapidKey: string,
): Promise<string | null> {
  if (!vapidKey) return null
  const messaging = await getMessagingIfSupported(app)
  if (!messaging) return null
  try {
    const token = await getToken(messaging, { vapidKey })
    return token || null
  } catch {
    return null
  }
}
