import { getAnalytics, isSupported } from 'firebase/analytics'
import { app } from './config'

/** Analytics só em browser e se o projeto tiver measurementId + suporte. */
const firebaseApp = app
if (firebaseApp) {
  void isSupported().then((ok) => {
    if (!ok) return
    try {
      getAnalytics(firebaseApp)
    } catch {
      /* já inicializado ou ambiente bloqueado */
    }
  })
}
