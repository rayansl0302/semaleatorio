import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import { db } from '../firebase/config'
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
    if (!db || !target || target.uid === fromUid) return
    setSending(true)
    setMsg(null)
    try {
      await addDoc(collection(db, 'reports'), {
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
          Denunciar {target.nickname}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          A moderação analisa cada caso. Não abuses desta ferramenta.
        </p>
        {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
        <label className="mt-4 block text-sm text-slate-300">
          Motivo
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-white"
          >
            {REASONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm text-slate-300">
          Detalhes (opcional, até 500 caracteres)
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            maxLength={500}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-white"
          />
        </label>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2 text-sm text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={sending}
            className="flex-1 rounded-lg bg-secondary py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {sending ? 'Enviando…' : 'Enviar denúncia'}
          </button>
        </div>
      </form>
    </div>
  )
}
