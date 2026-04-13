import { useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import { db } from '../firebase/config'
import { submitRatingToFirestore } from '../lib/ratingsFirestore'

type Props = {
  open: boolean
  onClose: () => void
  target: { uid: string; nickname: string } | null
  fromUid: string
}

export function RateUserModal({ open, onClose, target, fromUid }: Props) {
  const toast = useToast()
  const [comm, setComm] = useState(5)
  const [skill, setSkill] = useState(5)
  const [tox, setTox] = useState(1)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!target || target.uid === fromUid) return
    if (!db) {
      setMsg('Firestore não está configurado.')
      toast.error('Firestore não está configurado.')
      return
    }
    setSending(true)
    setMsg(null)
    try {
      await submitRatingToFirestore(db, {
        fromUid,
        toUid: target.uid,
        communication: comm,
        skill,
        toxicity: tox,
      })
      setMsg('Avaliação enviada. Valeu por ajudar a comunidade!')
      toast.success('Avaliação enviada. Obrigado!')
      setTimeout(onClose, 1200)
    } catch (e: unknown) {
      const m =
        e instanceof Error ? e.message : 'Não foi possível enviar. Tente novamente.'
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
          Avaliar {target.nickname}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Comunicação, habilidade e toxicidade (1 = muito tóxico)
        </p>
        {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
        <label className="mt-4 block text-sm text-slate-300">
          Comunicação: {comm}
          <input
            type="range"
            min={1}
            max={5}
            value={comm}
            onChange={(e) => setComm(+e.target.value)}
            className="mt-1 w-full accent-primary"
          />
        </label>
        <label className="mt-3 block text-sm text-slate-300">
          Habilidade: {skill}
          <input
            type="range"
            min={1}
            max={5}
            value={skill}
            onChange={(e) => setSkill(+e.target.value)}
            className="mt-1 w-full accent-primary"
          />
        </label>
        <label className="mt-3 block text-sm text-slate-300">
          Toxicidade (baixo é melhor): {tox}
          <input
            type="range"
            min={1}
            max={5}
            value={tox}
            onChange={(e) => setTox(+e.target.value)}
            className="mt-1 w-full accent-primary"
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
            disabled={sending || target.uid === fromUid}
            className="flex-1 rounded-lg bg-secondary py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {sending ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </form>
    </div>
  )
}
