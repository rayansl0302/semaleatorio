import { FirebaseError } from 'firebase/app'

/** Mensagens mais claras para erros de httpsCallable (deploy, env, etc.). */
export function formatHttpsCallableError(e: unknown): string {
  if (e instanceof FirebaseError) {
    if (e.code === 'functions/not-found') {
      return 'A função ainda não está publicada neste projeto Firebase (o servidor responde 404). O .env e a região us-central1 podem estar certos — falta o deploy. Na raiz: npx firebase-tools login && npx firebase-tools deploy --only functions. Depois confira no Console → Functions se existem prepareRiotOAuth e completeRiotOAuth.'
    }
    return e.message || e.code
  }
  if (e instanceof Error) return e.message
  return 'Erro ao falar com o servidor.'
}
