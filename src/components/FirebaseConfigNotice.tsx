import { firebaseFeedBlockedReason, firebaseReady } from '../firebase/config'

/** Aviso quando Firebase Web / Firestore não estão prontos. */
export function FirebaseConfigNotice() {
  const reason = firebaseFeedBlockedReason()
  if (!reason) return null

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-100">
      <h1 className="text-lg font-semibold">Configure o Firebase</h1>
      <p className="mt-2 text-sm opacity-90">
        Preencha no <code className="rounded bg-black/30 px-1">.env</code> as variáveis{' '}
        <code className="rounded bg-black/30 px-1">VITE_FIREBASE_*</code> (API key, auth domain,
        project id, storage, messaging sender id, app id). O feed, o mural e o chat usam{' '}
        <strong>Firestore</strong>.
      </p>
      <p className="mt-2 text-sm opacity-90">
        Reinicie o <code className="rounded bg-black/30 px-1">npm run dev</code> após salvar o
        arquivo.
      </p>
      {import.meta.env.DEV && (
        <p className="mt-3 rounded-lg bg-black/20 px-3 py-2 font-mono text-[11px] text-slate-300">
          firebaseReady={String(firebaseReady)}
        </p>
      )}
    </div>
  )
}
