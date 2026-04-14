import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { useChatFocus } from './ChatFocusContext'
import { useAdminPanelOnlyUids } from '../hooks/useAdminPanelOnlyUids'
import { useMessageThreads } from '../hooks/useMessageThreads'
import { loadThreadReadMap, saveThreadReadMap, type ThreadReadMap } from '../lib/messageReadStorage'
import { playIncomingMessageChime } from '../lib/messagePingSound'
import type { MessageDoc } from '../types/models'

function millis(m: MessageDoc): number {
  return m.createdAt?.toMillis?.() ?? 0
}

/** Sobrevive a remounts (StrictMode) por sessão. */
const seenIncomingIdsByUid = new Map<string, Set<string>>()
const baselinedIncomingByUid = new Map<string, boolean>()

function getSeenIncomingSet(uid: string): Set<string> {
  let s = seenIncomingIdsByUid.get(uid)
  if (!s) {
    s = new Set()
    seenIncomingIdsByUid.set(uid, s)
  }
  return s
}

function truncateText(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

type MessageThreadsContextValue = {
  threads: ReturnType<typeof useMessageThreads>['threads']
  unreadCount: number
  markThreadRead: (threadId: string, atMillis: number) => void
  isThreadUnread: (threadId: string, last: MessageDoc) => boolean
}

const MessageThreadsContext = createContext<MessageThreadsContextValue | undefined>(undefined)

function peerUidForMessage(m: MessageDoc, myUid: string): string {
  return m.fromUid === myUid ? m.toUid : m.fromUid
}

function useIncomingPing(
  myUid: string | undefined,
  toList: MessageDoc[],
  focusedPeerUid: string | null,
  toastInfo: (msg: string) => void,
  staffUids: ReadonlySet<string>,
) {
  const toastRef = useRef(toastInfo)
  toastRef.current = toastInfo

  useEffect(() => {
    if (!myUid) return

    const seen = getSeenIncomingSet(myUid)

    if (!baselinedIncomingByUid.get(myUid)) {
      if (toList.length === 0) return
      for (const m of toList) seen.add(m.id)
      baselinedIncomingByUid.set(myUid, true)
      return
    }

    const newlyArrived: MessageDoc[] = []
    for (const m of toList) {
      if (seen.has(m.id)) continue
      seen.add(m.id)
      if (m.fromUid !== myUid) newlyArrived.push(m)
    }

    const relevant = newlyArrived.filter(
      (m) =>
        m.fromUid !== focusedPeerUid &&
        !staffUids.has(peerUidForMessage(m, myUid)),
    )
    if (relevant.length === 0) return

    playIncomingMessageChime()
    relevant.sort((a, b) => millis(b) - millis(a))
    const latest = relevant[0]
    const preview = truncateText(typeof latest.text === 'string' ? latest.text : '', 80)
    if (relevant.length === 1) {
      toastRef.current(preview ? `Nova mensagem: ${preview}` : 'Nova mensagem')
    } else {
      toastRef.current(
        `${relevant.length} novas mensagens${preview ? ` · ${preview}` : ''}`,
      )
    }
  }, [myUid, toList, focusedPeerUid, staffUids])
}

export function MessageThreadsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const toast = useToast()
  const { focusedThreadPeerUid } = useChatFocus()
  const { threads, toList } = useMessageThreads(user?.uid)
  const staffUids = useAdminPanelOnlyUids()

  const threadsVisible = useMemo(
    () => threads.filter((t) => !staffUids.has(t.peerUid)),
    [threads, staffUids],
  )

  const toListVisible = useMemo(() => {
    const uid = user?.uid
    if (!uid || staffUids.size === 0) return toList
    return toList.filter((m) => !staffUids.has(peerUidForMessage(m, uid)))
  }, [toList, user?.uid, staffUids])

  const [readMap, setReadMap] = useState<ThreadReadMap>(() => loadThreadReadMap())

  const markThreadRead = useCallback((threadId: string, atMillis: number) => {
    if (!threadId || !Number.isFinite(atMillis)) return
    setReadMap((prev) => {
      const cur = prev[threadId] ?? 0
      if (atMillis <= cur) return prev
      const next = { ...prev, [threadId]: atMillis }
      saveThreadReadMap(next)
      return next
    })
  }, [])

  const myUid = user?.uid

  const isThreadUnread = useCallback(
    (threadId: string, last: MessageDoc) => {
      if (!myUid) return false
      if (last.fromUid === myUid) return false
      if (last.toUid !== myUid) return false
      return millis(last) > (readMap[threadId] ?? 0)
    },
    [myUid, readMap],
  )

  const unreadCount = useMemo(() => {
    if (!myUid) return 0
    let n = 0
    for (const t of threadsVisible) {
      if (isThreadUnread(t.threadId, t.last)) n += 1
    }
    return n
  }, [threadsVisible, myUid, isThreadUnread])

  const baseTitleRef = useRef<string | null>(null)
  useEffect(() => {
    if (baseTitleRef.current === null) baseTitleRef.current = document.title
  }, [])

  useEffect(() => {
    const base = baseTitleRef.current ?? 'SemAleatório'
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${base}`
    } else {
      document.title = base
    }
  }, [unreadCount])

  useIncomingPing(
    myUid,
    toListVisible,
    focusedThreadPeerUid,
    (msg) => toast.info(msg),
    staffUids,
  )

  const value = useMemo(
    () => ({
      threads: threadsVisible,
      unreadCount,
      markThreadRead,
      isThreadUnread,
    }),
    [threadsVisible, unreadCount, markThreadRead, isThreadUnread],
  )

  return (
    <MessageThreadsContext.Provider value={value}>{children}</MessageThreadsContext.Provider>
  )
}

export function useMessageThreadsContext(): MessageThreadsContextValue {
  const ctx = useContext(MessageThreadsContext)
  if (!ctx) {
    throw new Error('useMessageThreadsContext deve ser usado dentro de MessageThreadsProvider')
  }
  return ctx
}
