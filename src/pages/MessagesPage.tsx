import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChatMessagesPane, ChatThreadHeader } from '../components/ChatMessagesPane'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase/config'
import { useFirestoreUserProfile } from '../hooks/useFirestoreUserProfile'
import {
  extractLikelyFirebaseUid,
  normalizePeerUid,
  threadIdFor,
} from '../lib/messages'
import { pushMessageFs, subscribeThreadMessagesFs } from '../lib/firestoreMessages'
import type { MessageDoc } from '../types/models'

export function MessagesPage() {
  const { user, profile: myProfile } = useAuth()
  const [params, setParams] = useSearchParams()
  const otherUid = params.get('com') ?? ''
  const [peerInput, setPeerInput] = useState(otherUid)
  const [text, setText] = useState('')
  const [messages, setMessages] = useState<MessageDoc[]>([])
  const [pasteHint, setPasteHint] = useState<string | null>(null)
  const [listenError, setListenError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    if (otherUid) setPeerInput(otherUid)
  }, [otherUid])

  const activePeer = useMemo(() => {
    const raw = (otherUid || peerInput.trim()).trim()
    if (!raw) return ''
    return normalizePeerUid(raw)
  }, [otherUid, peerInput])

  const tid = useMemo(() => {
    if (!user || !activePeer) return ''
    return threadIdFor(user.uid, activePeer)
  }, [user, activePeer])

  const peerProfile = useFirestoreUserProfile(activePeer || undefined)

  const peerLabelShort = useMemo(
    () => (activePeer ? `${activePeer.slice(0, 8)}…` : ''),
    [activePeer],
  )

  const viewerLabel = useMemo(() => {
    if (myProfile?.nickname) return `${myProfile.nickname}#${myProfile.tag}`
    return user?.displayName?.trim() || 'Eu'
  }, [myProfile, user?.displayName])

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
        setPasteHint('Não encontramos um UID na área de transferência. Cole um texto com o ID (20–32 caracteres).')
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
          Faça login
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
              const uid = normalizePeerUid(peerInput)
              if (uid) setParams({ com: uid })
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
      {!activePeer ? (
        <div className="p-6">
          <p className="text-sm text-slate-500">
            Informe o UID da outra pessoa para ver a conversa.
          </p>
        </div>
      ) : (
        <div className="flex h-[min(62vh,520px)] min-h-[280px] flex-col overflow-hidden rounded-b-2xl">
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
        </div>
      )}
    </div>
  )
}
