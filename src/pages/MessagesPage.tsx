import {
  addDoc,
  and,
  collection,
  onSnapshot,
  or,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase/config'
import { extractLikelyFirebaseUid, threadIdFor } from '../lib/messages'
import type { MessageDoc } from '../types/models'

export function MessagesPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const otherUid = params.get('com') ?? ''
  const [peerInput, setPeerInput] = useState(otherUid)
  const [text, setText] = useState('')
  const [messages, setMessages] = useState<MessageDoc[]>([])
  const [pasteHint, setPasteHint] = useState<string | null>(null)

  useEffect(() => {
    if (otherUid) setPeerInput(otherUid)
  }, [otherUid])

  const activePeer = otherUid || peerInput.trim()

  const tid = useMemo(() => {
    if (!user || !activePeer) return ''
    return threadIdFor(user.uid, activePeer)
  }, [user, activePeer])

  useEffect(() => {
    if (!db || !tid || !user) {
      setMessages([])
      return
    }
    const uid = user.uid
    const q = query(
      collection(db, 'messages'),
      or(
        and(where('threadId', '==', tid), where('fromUid', '==', uid)),
        and(where('threadId', '==', tid), where('toUid', '==', uid)),
      ),
      orderBy('createdAt', 'asc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: MessageDoc[] = []
        snap.forEach((d) =>
          list.push({ id: d.id, ...(d.data() as Omit<MessageDoc, 'id'>) }),
        )
        setMessages(list)
      },
      () => setMessages([]),
    )
    return () => unsub()
  }, [tid, user])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !user || !activePeer || !text.trim()) return
    await addDoc(collection(db, 'messages'), {
      threadId: threadIdFor(user.uid, activePeer),
      fromUid: user.uid,
      toUid: activePeer,
      text: text.trim(),
      createdAt: serverTimestamp(),
    })
    setText('')
  }

  async function pasteUidFromClipboard() {
    setPasteHint(null)
    try {
      const raw = await navigator.clipboard.readText()
      const uid = extractLikelyFirebaseUid(raw)
      if (uid) {
        setPeerInput(uid)
        setParams({ com: uid })
        setPasteHint('UID colado e conversa aberta.')
      } else {
        setPasteHint('Não achei um UID no clipboard. Cole um texto com o ID (20–32 caracteres).')
      }
    } catch {
      setPasteHint('Permita acesso à área de transferência ou cole manualmente no campo.')
    }
  }

  if (!user) {
    return (
      <p className="text-slate-500">
        <Link
          to="/entrar?redirect=/app/mensagens"
          className="text-primary underline-offset-2 hover:underline"
        >
          Entre
        </Link>{' '}
        para usar o chat opcional.
      </p>
    )
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-semibold text-white">Mensagens</h1>
        <p className="text-xs text-slate-500">
          Cole o UID do perfil do jogador (perfil → copiar UID) ou use o botão{' '}
          <strong className="text-slate-400">Colar UID</strong>. Você também pode
          colar direto no campo: o app tenta detectar o ID no texto.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={peerInput}
            onChange={(e) => setPeerInput(e.target.value)}
            onPaste={(e) => {
              const raw = e.clipboardData.getData('text')
              const uid = extractLikelyFirebaseUid(raw)
              if (uid && raw.trim() !== uid) {
                e.preventDefault()
                setPeerInput(uid)
                setParams({ com: uid })
                setPasteHint('UID detectado na colagem.')
              }
            }}
            placeholder="Cole o UID aqui (Ctrl+V)"
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={() => void pasteUidFromClipboard()}
            className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
          >
            Colar UID
          </button>
          <button
            type="button"
            onClick={() => {
              const trimmed = peerInput.trim()
              const uid = extractLikelyFirebaseUid(trimmed) ?? trimmed
              setParams({ com: uid })
            }}
            className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-white"
          >
            Abrir
          </button>
        </div>
        {pasteHint && (
          <p className="mt-2 text-xs text-primary/90">{pasteHint}</p>
        )}
      </div>
      <div className="flex h-[min(50vh,420px)] flex-col gap-2 overflow-y-auto p-4">
        {!activePeer && (
          <p className="text-sm text-slate-500">
            Informe o UID da outra pessoa para ver a conversa.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.fromUid === user.uid
          return (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                mine
                  ? 'ml-auto bg-primary text-black'
                  : 'mr-auto bg-white/10 text-slate-100'
              }`}
            >
              {m.text}
            </div>
          )
        })}
      </div>
      <form onSubmit={send} className="border-t border-border p-4">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensagem…"
            disabled={!activePeer}
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!activePeer || !text.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  )
}
