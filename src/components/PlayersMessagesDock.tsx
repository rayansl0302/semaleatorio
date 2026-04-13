import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChatMessagesPane, ChatThreadHeader } from './ChatMessagesPane'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { db } from '../firebase/config'
import { useMessageThreads } from '../hooks/useMessageThreads'
import { usePlayers } from '../hooks/usePlayers'
import {
  extractLikelyFirebaseUid,
  normalizePeerUid,
  threadIdFor,
} from '../lib/messages'
import { MESSAGE_DOCK_OPEN_EVENT } from '../lib/messageDock'
import { pushMessageFs, subscribeThreadMessagesFs } from '../lib/firestoreMessages'
import { useFirestoreUserProfile } from '../hooks/useFirestoreUserProfile'
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
  const toast = useToast()
  const { user, profile: myProfile } = useAuth()
  const [messages, setMessages] = useState<MessageDoc[]>([])
  const [text, setText] = useState('')
  const [listenError, setListenError] = useState<string | null>(null)

  const peerNorm = useMemo(() => normalizePeerUid(peerUid), [peerUid])
  const tid = useMemo(() => threadIdFor(myUid, peerNorm), [myUid, peerNorm])
  const peerProfile = useFirestoreUserProfile(peerNorm)

  const viewerLabel = useMemo(() => {
    if (myProfile?.nickname) return `${myProfile.nickname}#${myProfile.tag}`
    return user?.displayName?.trim() || 'Eu'
  }, [myProfile, user?.displayName])

  useEffect(() => {
    if (!db || !tid) {
      setMessages([])
      setListenError(null)
      return
    }
    setListenError(null)
    return subscribeThreadMessagesFs(db, tid, myUid, setMessages, (err) => {
      setListenError(err.code)
      console.error('[DockChat]', err)
    })
  }, [tid, myUid])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !text.trim()) return
    try {
      await pushMessageFs(db, {
        threadId: tid,
        fromUid: myUid,
        toUid: peerNorm,
        text: text.trim(),
      })
      setText('')
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : 'erro'
      toast.error(`Não foi possível enviar (${code}).`)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatThreadHeader
        peerUid={peerNorm}
        peerProfile={peerProfile}
        peerLabelShort={peerLabel}
        leadingSlot={
          <button
            type="button"
            onClick={onBack}
            className="-ml-0.5 flex shrink-0 items-center rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Voltar às conversas"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        }
        compactLink={
          <Link
            to={`/app/mensagens?com=${encodeURIComponent(peerNorm)}`}
            className="mt-0.5 inline-block text-[11px] text-primary hover:underline"
          >
            Abrir em tela cheia
          </Link>
        }
      />
      <ChatMessagesPane
        messages={messages}
        viewerUid={myUid}
        viewerPhotoUrl={user?.photoURL}
        viewerLabel={viewerLabel}
        peerUid={peerNorm}
        peerProfile={peerProfile}
        peerLabelShort={peerLabel}
      />
      {listenError && (
        <p className="shrink-0 border-t border-amber-500/30 bg-amber-500/15 px-2 py-1.5 text-[10px] text-amber-100">
          Erro: {listenError}
        </p>
      )}
      <form
        onSubmit={(e) => void send(e)}
        className="shrink-0 border-t border-border bg-[#1a232e] p-2"
      >
        <div className="flex gap-1.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensagem"
            className="min-w-0 flex-1 rounded-full border border-border/80 bg-[#2a3942] px-3 py-2 text-xs text-white placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="shrink-0 rounded-full bg-primary px-3 py-2 text-xs font-bold text-black disabled:opacity-40"
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
  const { threads } = useMessageThreads(user?.uid)
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null)
  const [dockPasteHint, setDockPasteHint] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const onOpen = (e: Event) => {
      const uid = (e as CustomEvent<{ peerUid?: string }>).detail?.peerUid
      if (!uid || uid === user.uid) return
      setSelectedPeer(normalizePeerUid(uid))
      setExpanded(true)
    }
    window.addEventListener(MESSAGE_DOCK_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(MESSAGE_DOCK_OPEN_EVENT, onOpen)
  }, [user])

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
      className={`fixed z-50 flex flex-col border border-border bg-card shadow-[0_-8px_40px_rgba(0,0,0,0.45)] transition-[width,height] duration-200 sm:right-4 ${
        expanded
          ? 'bottom-0 right-0 max-h-[min(560px,72vh)] w-full max-w-full sm:bottom-6 sm:w-[min(100vw-2rem,400px)] sm:max-w-[400px] sm:rounded-2xl'
          : 'bottom-0 right-0 w-full max-w-full sm:bottom-6 sm:right-6 sm:w-[min(100vw-2rem,320px)] sm:max-w-[320px]'
      } rounded-t-2xl sm:rounded-2xl`}
    >
      <button
        type="button"
        onClick={() => {
          setExpanded((e) => !e)
          if (expanded) setSelectedPeer(null)
        }}
        className="flex w-full items-center justify-between gap-2 border-b border-border bg-card/95 px-4 py-3 text-left hover:bg-white/[0.04] sm:rounded-t-2xl"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-white">
            Mensagens
          </span>
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
        setSelectedPeer(normalizePeerUid(uid))
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
              <div className="min-h-0 flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-slate-500">
                    {threads.length === 0
                      ? 'Nenhuma conversa ainda. Use Mensagem no feed ou no mural, ou abra pelo UID em Mensagens.'
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
