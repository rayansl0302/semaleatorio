import { push, ref, serverTimestamp, set } from 'firebase/database'
import { useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import { rtdb } from '../firebase/config'
import type { UserProfile } from '../types/models'

const REASONS = [
  { id: 'toxic', label: 'Comportamento tóxico' },
  { id: 'harassment', label: 'Assédio / ameaça' },
  { id: 'spam', label: 'Spam ou golpe' },
  { id: 'other', label: 'Outro' },
] as const

type Props = {
  open: boolean
  target: UserProfile | null
  fromUid: string
  onClose: () => void
}

export function ReportPlayerModal({ open, target, fromUid, onClose }: Props) {
  const toast = useToast()
  const [reason, setReason] = useState<string>('toxic')
  const [detail, setDetail] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!rtdb || !target || target.uid === fromUid) return
    setSending(true)
    setMsg(null)
    try {
      const newRef = push(ref(rtdb, 'reports'))
      await set(newRef, {
        fromUid,
        toUid: target.uid,
        reason,
        detail: detail.trim().slice(0, 500),
        createdAt: serverTimestamp(),
      })
      setMsg('Recebemos sua denúncia. A moderação vai analisar.')
      toast.success('Denúncia enviada.')
      setTimeout(onClose, 1500)
    } catch {
      const m = 'Não foi possível enviar. Tente de novo.'
      setMsg(m)
      toast.error(m)
    } finally {
      setSending(false)
    }
  }

  if (!open || !target) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <h2 className="text-lg font-semibold text-white">
          Reportar {target.nickname}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Denúncias falsas podem resultar em penalidade na conta.
        </p>
        {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
        <div className="mt-4 space-y-2">
          {REASONS.map((r) => (
            <label
              key={r.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-slate-300 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="reason"
                value={r.id}
                checked={reason === r.id}
                onChange={() => setReason(r.id)}
                className="text-primary"
              />
              {r.label}
            </label>
          ))}
        </div>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Detalhes (opcional)"
          rows={3}
          className="mt-3 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2 text-sm text-slate-400"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={sending}
            className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {sending ? 'Enviando…' : 'Enviar denúncia'}
          </button>
        </div>
      </form>
    </div>
  )
}
