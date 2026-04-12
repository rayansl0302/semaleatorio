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
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase/config'
import { useMessageThreads } from '../hooks/useMessageThreads'
import { usePlayers } from '../hooks/usePlayers'
import { extractLikelyFirebaseUid, threadIdFor } from '../lib/messages'
import type { MessageDoc, UserProfile } from '../types/models'

function formatDockTime(createdAt: MessageDoc['createdAt']): string {
  if (!createdAt || typeof createdAt.toDate !== 'function') return ''
  return createdAt.toDate().toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function peerOnline(p: UserProfile | undefined): boolean {
  if (!p?.lastOnline || typeof p.lastOnline.toMillis !== 'function') return false
  return Date.now() - p.lastOnline.toMillis() < 5 * 60_000
}

type DockChatProps = {
  myUid: string
  peerUid: string
  peerLabel: string
  onBack: () => void
}

function DockChatPanel({ myUid, peerUid, peerLabel, onBack }: DockChatProps) {
  const [messages, setMessages] = useState<MessageDoc[]>([])
  const [text, setText] = useState('')

  const tid = useMemo(() => threadIdFor(myUid, peerUid), [myUid, peerUid])

  useEffect(() => {
    if (!db || !tid) {
      setMessages([])
      return
    }
    const uid = myUid
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
  }, [tid, myUid])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !text.trim()) return
    await addDoc(collection(db, 'messages'), {
      threadId: tid,
      fromUid: myUid,
      toUid: peerUid,
      text: text.trim(),
      createdAt: serverTimestamp(),
    })
    setText('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Voltar às conversas"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{peerLabel}</p>
          <Link
            to={`/app/mensagens?com=${encodeURIComponent(peerUid)}`}
            className="text-[11px] text-primary hover:underline"
          >
            Abrir em tela cheia
          </Link>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {messages.map((m) => {
          const mine = m.fromUid === myUid
          return (
            <div
              key={m.id}
              className={`max-w-[90%] rounded-lg px-2.5 py-1.5 text-xs leading-snug ${
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
      <form onSubmit={send} className="shrink-0 border-t border-border p-2">
        <div className="flex gap-1.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensagem…"
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-black disabled:opacity-40"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  )
}

export function PlayersMessagesDock() {
  const { user } = useAuth()
  const { players } = usePlayers()
  const { threads, error } = useMessageThreads(user?.uid)
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null)
  const [dockPasteHint, setDockPasteHint] = useState<string | null>(null)

  if (!user || !db) return null

  function labelFor(uid: string): string {
    const p = players.find((x) => x.uid === uid)
    return p ? `${p.nickname}#${p.tag}` : `${uid.slice(0, 6)}…`
  }

  function profileFor(uid: string): UserProfile | undefined {
    return players.find((x) => x.uid === uid)
  }

  const filtered = threads.filter((t) =>
    labelFor(t.peerUid).toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <div
      className={`fixed z-50 flex flex-col border border-border bg-card shadow-2xl shadow-black/50 transition-[width,height] duration-200 sm:right-4 ${
        expanded
          ? 'bottom-0 right-0 max-h-[min(520px,70vh)] w-full max-w-full sm:bottom-4 sm:w-[min(100vw-2rem,340px)] sm:max-w-[340px] sm:rounded-xl'
          : 'bottom-0 right-0 w-full max-w-full sm:bottom-4 sm:right-4 sm:w-[min(100vw-2rem,300px)] sm:max-w-[300px]'
      } rounded-t-xl sm:rounded-xl`}
    >
      <button
        type="button"
        onClick={() => {
          setExpanded((e) => !e)
          if (expanded) setSelectedPeer(null)
        }}
        className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2.5 text-left hover:bg-white/[0.04] sm:rounded-t-xl"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm font-semibold text-white">Mensagens</span>
          {threads.length > 0 && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-400">
              {threads.length}
            </span>
          )}
        </div>
        <svg
          className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {expanded && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {selectedPeer && user ? (
            <DockChatPanel
              myUid={user.uid}
              peerUid={selectedPeer}
              peerLabel={labelFor(selectedPeer)}
              onBack={() => setSelectedPeer(null)}
            />
          ) : (
            <>
              <div className="shrink-0 space-y-2 border-b border-border px-2 py-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar conversas…"
                  className="w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={async () => {
                    setDockPasteHint(null)
                    try {
                      const raw = await navigator.clipboard.readText()
                      const uid = extractLikelyFirebaseUid(raw)
                      if (uid && uid !== user.uid) {
                        setSelectedPeer(uid)
                        setDockPasteHint('Conversa aberta.')
                      } else {
                        setDockPasteHint(
                          uid === user.uid
                            ? 'Esse UID é o seu.'
                            : 'Cole um UID válido no clipboard.',
                        )
                      }
                    } catch {
                      setDockPasteHint('Permita acesso à área de transferência.')
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-white/5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/10"
                >
                  Colar UID e abrir conversa
                </button>
                {dockPasteHint && (
                  <p className="text-[10px] text-primary/90">{dockPasteHint}</p>
                )}
              </div>
              {error && (
                <p className="shrink-0 px-3 py-2 text-[11px] text-red-400">{error}</p>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-slate-500">
                    {threads.length === 0
                      ? 'Nenhuma conversa ainda. Use Chamar no card do jogador ou abra pelo UID em Mensagens.'
                      : 'Nenhum resultado.'}
                  </p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {filtered.map((t) => {
                      const p = profileFor(t.peerUid)
                      const online = peerOnline(p)
                      const initial = (p?.nickname?.[0] ?? t.peerUid[0] ?? '?').toUpperCase()
                      return (
                        <li key={t.threadId}>
                          <button
                            type="button"
                            onClick={() => setSelectedPeer(t.peerUid)}
                            className="flex w-full gap-2.5 px-3 py-2.5 text-left hover:bg-white/[0.04]"
                          >
                            <div className="relative shrink-0">
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/40 text-xs font-bold text-white">
                                {initial}
                              </span>
                              {online && (
                                <span
                                  className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary ring-0"
                                  title="Ativo recentemente"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-1">
                                <span className="truncate text-sm font-medium text-white">
                                  {labelFor(t.peerUid)}
                                </span>
                                <span className="shrink-0 text-[10px] text-slate-500">
                                  {formatDockTime(t.lastAt)}
                                </span>
                              </div>
                              <p className="truncate text-xs text-slate-500">{t.lastText}</p>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
              <div className="shrink-0 border-t border-border px-3 py-2">
                <Link
                  to="/app/mensagens"
                  className="block text-center text-xs font-medium text-primary hover:underline"
                >
                  Ir para mensagens (tela cheia)
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
