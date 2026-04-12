import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useState } from 'react'
import { db } from '../firebase/config'
import { LolEloIcon, LolRoleIcon } from './LolIcons'
import { ELO_ORDER, ROLES } from '../lib/constants'
import type { QueueType } from '../types/models'

type Props = {
  uid: string
  onCreated?: () => void
}

export function PostComposer({ uid, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eloMin, setEloMin] = useState('GOLD')
  const [role, setRole] = useState('JUNGLE')
  const [queueType, setQueueType] = useState<QueueType>('duo')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !title.trim()) return
    setSending(true)
    setErr(null)
    try {
      await addDoc(collection(db, 'posts'), {
        uid,
        title: title.trim(),
        description: description.trim(),
        eloMin,
        role,
        queueType,
        createdAt: serverTimestamp(),
      })
      setTitle('')
      setDescription('')
      onCreated?.()
    } catch {
      setErr('Não foi possível publicar. Verifique as regras do Firestore.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-card p-4"
    >
      <h3 className="text-sm font-semibold text-white">Novo post LFG</h3>
      <p className="mt-1 text-xs text-slate-500">
        Ex.: &quot;Procuro jungler Gold+ sem tilt pra duo agora&quot;
      </p>
      {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título"
        className="mt-3 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrição (opcional)"
        rows={2}
        className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
      />
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="flex min-w-0 items-center gap-2">
          <LolEloIcon elo={eloMin} className="h-9 w-9 shrink-0" />
          <select
            value={eloMin}
            onChange={(e) => setEloMin(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
          >
            {ELO_ORDER.filter((x) => x !== 'UNRANKED').map((e) => (
              <option key={e} value={e}>
                Mín {e}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-2">
          <LolRoleIcon role={role} className="h-8 w-8 shrink-0" />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <select
          value={queueType}
          onChange={(e) => setQueueType(e.target.value as QueueType)}
          className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
        >
          <option value="duo">Duo</option>
          <option value="flex">Flex</option>
          <option value="clash">Clash</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={sending}
        className="mt-3 w-full rounded-lg bg-accent py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
      >
        {sending ? 'Publicando…' : 'Publicar no feed'}
      </button>
    </form>
  )
}
