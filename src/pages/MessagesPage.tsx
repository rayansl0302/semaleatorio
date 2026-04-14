import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChatMessagesPane, ChatThreadHeader } from '../components/ChatMessagesPane'
import { useAuth } from '../contexts/AuthContext'
import { useChatFocus } from '../contexts/ChatFocusContext'
import { useMessageThreadsContext } from '../contexts/MessageThreadsContext'
import { db } from '../firebase/config'
import { usePlayers } from '../hooks/usePlayers'
import { useFirestoreUserProfile } from '../hooks/useFirestoreUserProfile'
import {
  extractLikelyFirebaseUid,
  normalizePeerUid,
  threadIdFor,
} from '../lib/messages'
import { pushMessageFs, subscribeThreadMessagesFs } from '../lib/firestoreMessages'
import { isPremiumActive, premiumVariantOf } from '../lib/plan'
import type { MessageDoc, UserProfile } from '../types/models'

function formatThreadTime(createdAt: MessageDoc['createdAt']): string {
  if (!createdAt || typeof createdAt.toDate !== 'function') return ''
  return createdAt.toDate().toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MessagesPage() {
  const { user, profile: myProfile } = useAuth()
  const { setFocusedThreadPeer } = useChatFocus()
  const { threads, markThreadRead, isThreadUnread } = useMessageThreadsContext()
  const { players } = usePlayers()
  const [params, setParams] = useSearchParams()
  const otherUid = params.get('com') ?? ''
  const [peerInput, setPeerInput] = useState(otherUid)
  const [text, setText] = useState('')
  const [messages, setMessages] = useState<MessageDoc[]>([])
  const [listenError, setListenError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (otherUid) setPeerInput(otherUid)
  }, [otherUid])

  const activePeer = useMemo(() => {
    const raw = (otherUid || '').trim()
    if (!raw) return ''
    return normalizePeerUid(raw)
  }, [otherUid])

  const tid = useMemo(() => {
    if (!user || !activePeer) return ''
    return threadIdFor(user.uid, activePeer)
  }, [user, activePeer])

  const peerProfile = useFirestoreUserProfile(activePeer || undefined)

  function profileFor(uid: string): UserProfile | undefined {
    return players.find((x) => x.uid === uid)
  }

  function labelFor(uid: string): string {
    const p = profileFor(uid)
    return p ? `${p.nickname}#${p.tag}` : `${uid.slice(0, 8)}…`
  }

  const peerLabelShort = useMemo(
    () => (activePeer ? labelFor(activePeer) : ''),
    [activePeer, players],
  )

  const viewerLabel = useMemo(() => {
    if (myProfile?.nickname) return `${myProfile.nickname}#${myProfile.tag}`
    return user?.displayName?.trim() || 'Eu'
  }, [myProfile, user?.displayName])

  useEffect(() => {
    if (!activePeer) {
      setFocusedThreadPeer(null)
      return
    }
    setFocusedThreadPeer(activePeer)
    return () => setFocusedThreadPeer(null)
  }, [activePeer, setFocusedThreadPeer])

  useEffect(() => {
    if (!tid || !messages.length) return
    const maxM = Math.max(...messages.map((m) => m.createdAt?.toMillis?.() ?? 0))
    if (maxM > 0) markThreadRead(tid, maxM)
  }, [tid, messages, markThreadRead])

  useEffect(() => {
    if (!db || !tid || !user) {
      setMessages([])
      setListenError(null)
      return
    }
    setListenError(null)
    return subscribeThreadMessagesFs(db, tid, user.uid, setMessages, (err) => {
      setListenError(
        err.code === 'permission-denied'
          ? 'Sem permissão para ler esta conversa. Confirme o UID e as regras do Firestore.'
          : `Não foi possível carregar mensagens (${err.code}).`,
      )
    })
  }, [tid, user])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !user || !activePeer || !text.trim()) return
    setSendError(null)
    try {
      await pushMessageFs(db, {
        threadId: threadIdFor(user.uid, activePeer),
        fromUid: user.uid,
        toUid: activePeer,
        text: text.trim(),
      })
      setText('')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'code' in err
          ? `Falha ao enviar (${String((err as { code: string }).code)}).`
          : 'Falha ao enviar. Verifique a rede e as regras do Firestore.'
      setSendError(msg)
    }
  }

  function openPeer(uid: string) {
    setParams({ com: uid })
  }

  const filtered = threads.filter((t) =>
    labelFor(t.peerUid).toLowerCase().includes(search.trim().toLowerCase()),
  )

  if (!user) {
    return (
      <p className="text-slate-500">
        <Link
          to="/entrar?redirect=/app/mensagens"
          className="text-primary underline-offset-2 hover:underline"
        >
          Faça login
        </Link>{' '}
        para usar o chat opcional.
      </p>
    )
  }

  return (
    <div className="mx-auto flex h-[min(78vh,700px)] max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/20">
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card/95 lg:w-80">
        <div className="shrink-0 border-b border-border p-4">
          <h1 className="text-lg font-semibold text-white">Mensagens</h1>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar conversas…"
            className="mt-3 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white placeholder:text-slate-600"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <svg className="h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
              <p className="text-xs text-slate-500">
                {threads.length === 0
                  ? 'Nenhuma conversa ainda. Envie uma mensagem pelo mural ou feed.'
                  : 'Nenhum resultado.'}
              </p>
            </div>
          ) : (
            <ul>
              {filtered.map((t) => {
                const p = profileFor(t.peerUid)
                const initial = (p?.nickname?.[0] ?? t.peerUid[0] ?? '?').toUpperCase()
                const unread = isThreadUnread(t.threadId, t.last)
                const isActive = activePeer === t.peerUid

                const peerIsPro = p && isPremiumActive(p) && premiumVariantOf(p) === 'complete'
                const peerIsEssential = p && isPremiumActive(p) && premiumVariantOf(p) === 'essential'
                const peerBoosted = (() => {
                  if (!p) return false
                  const bEnd =
                    p.boostUntil && typeof p.boostUntil.toMillis === 'function'
                      ? p.boostUntil.toMillis()
                      : 0
                  return bEnd > Date.now()
                })()

                const borderColor = isActive
                  ? 'border-l-primary'
                  : peerIsPro
                    ? 'border-l-amber-400'
                    : peerIsEssential
                      ? 'border-l-cyan-400'
                      : peerBoosted
                        ? 'border-l-emerald-400'
                        : 'border-l-transparent'

                const rowBg = isActive
                  ? 'bg-primary/10'
                  : peerIsPro
                    ? 'bg-amber-900/[0.07] hover:bg-amber-900/15'
                    : peerIsEssential
                      ? 'bg-cyan-900/[0.05] hover:bg-cyan-900/10'
                      : peerBoosted
                        ? 'bg-emerald-900/[0.05] hover:bg-emerald-900/10'
                        : 'hover:bg-white/[0.04]'

                const avatarClass = peerIsPro
                  ? 'bg-gradient-to-br from-amber-600/60 to-amber-900/40 ring-2 ring-amber-400/60 shadow-[0_0_6px_rgba(251,191,36,0.3)]'
                  : peerIsEssential
                    ? 'bg-gradient-to-br from-cyan-600/40 to-cyan-900/30 ring-2 ring-cyan-400/50'
                    : peerBoosted
                      ? 'bg-gradient-to-br from-emerald-600/40 to-emerald-900/30 ring-2 ring-emerald-400/50'
                      : 'bg-secondary/40'

                return (
                  <li key={t.threadId}>
                    <button
                      type="button"
                      onClick={() => openPeer(t.peerUid)}
                      className={`flex w-full gap-3 border-l-2 px-4 py-3 text-left transition ${borderColor} ${rowBg}`}
                    >
                      <div className="relative shrink-0">
                        <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${avatarClass}`}>
                          {initial}
                        </span>
                        {unread && (
                          <span
                            className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-primary shadow-sm ring-2 ring-card"
                            aria-hidden
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`truncate text-sm ${unread ? 'font-semibold text-white' : 'font-medium text-slate-200'}`}
                            >
                              {labelFor(t.peerUid)}
                            </span>
                            {peerIsPro && (
                              <span className="shrink-0 rounded bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 px-1.5 py-px text-[8px] font-extrabold uppercase tracking-wider text-amber-950">
                                PRO
                              </span>
                            )}
                            {peerIsEssential && (
                              <span className="shrink-0 rounded bg-gradient-to-r from-cyan-300 via-cyan-200 to-cyan-400 px-1.5 py-px text-[8px] font-extrabold uppercase tracking-wider text-cyan-950">
                                Premium
                              </span>
                            )}
                            {peerBoosted && (
                              <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-px text-[8px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                                ⚡
                              </span>
                            )}
                          </span>
                          <span
                            className={`shrink-0 text-[10px] ${unread ? 'font-semibold text-primary' : 'text-slate-500'}`}
                          >
                            {formatThreadTime(t.lastAt)}
                          </span>
                        </div>
                        <p
                          className={`truncate text-xs ${unread ? 'font-medium text-slate-300' : 'text-slate-500'}`}
                        >
                          {t.lastText}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-border p-3">
          <div className="flex gap-2">
            <input
              value={peerInput}
              onChange={(e) => setPeerInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const uid = normalizePeerUid(peerInput)
                  if (uid) openPeer(uid)
                }
              }}
              onPaste={(e) => {
                const raw = e.clipboardData.getData('text')
                const uid = extractLikelyFirebaseUid(raw)
                if (uid && raw.trim() !== uid) {
                  e.preventDefault()
                  setPeerInput(uid)
                  openPeer(uid)
                }
              }}
              placeholder="Colar UID para nova conversa"
              className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-xs text-white placeholder:text-slate-600"
            />
            <button
              type="button"
              onClick={() => {
                const uid = normalizePeerUid(peerInput)
                if (uid) openPeer(uid)
              }}
              className="shrink-0 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-white"
            >
              Abrir
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!activePeer ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
            <svg className="h-16 w-16 text-slate-700" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
            <p className="text-sm text-slate-500">Selecione uma conversa ao lado</p>
            <p className="text-xs text-slate-600">
              ou cole um UID no campo abaixo da lista para iniciar uma nova
            </p>
          </div>
        ) : (
          <>
            <ChatThreadHeader
              peerUid={activePeer}
              peerProfile={peerProfile}
              peerLabelShort={peerLabelShort}
              compactLink={
                peerProfile?.profileSlug ? (
                  <Link
                    to={`/u/${encodeURIComponent(peerProfile.profileSlug)}`}
                    className="mt-0.5 inline-block text-[11px] text-primary hover:underline"
                  >
                    Ver perfil público
                  </Link>
                ) : undefined
              }
            />
            <ChatMessagesPane
              messages={messages}
              viewerUid={user.uid}
              viewerPhotoUrl={user.photoURL}
              viewerLabel={viewerLabel}
              peerUid={activePeer}
              peerProfile={peerProfile}
              peerLabelShort={peerLabelShort}
            />
            {listenError && (
              <p className="shrink-0 border-t border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                {listenError}
              </p>
            )}
            <form
              onSubmit={(e) => void send(e)}
              className="shrink-0 border-t border-border bg-[#1a232e] p-3"
            >
              {sendError && (
                <p className="mb-2 text-xs text-red-400">{sendError}</p>
              )}
              <div className="flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Mensagem"
                  className="min-w-0 flex-1 rounded-full border border-border/80 bg-[#2a3942] px-4 py-2.5 text-sm text-white placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
                >
                  Enviar
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
