import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type ChatFocusValue = {
  /** Par cuja conversa está visível (página mensagens ou painel do dock). */
  focusedThreadPeerUid: string | null
  setFocusedThreadPeer: (uid: string | null) => void
}

const ChatFocusContext = createContext<ChatFocusValue | undefined>(undefined)

export function ChatFocusProvider({ children }: { children: ReactNode }) {
  const [focusedThreadPeerUid, setFocusedThreadPeerState] = useState<string | null>(null)

  const setFocusedThreadPeer = useCallback((uid: string | null) => {
    setFocusedThreadPeerState(uid)
  }, [])

  const value = useMemo(
    () => ({ focusedThreadPeerUid, setFocusedThreadPeer }),
    [focusedThreadPeerUid, setFocusedThreadPeer],
  )

  return <ChatFocusContext.Provider value={value}>{children}</ChatFocusContext.Provider>
}

export function useChatFocus(): ChatFocusValue {
  const ctx = useContext(ChatFocusContext)
  if (!ctx) {
    throw new Error('useChatFocus deve ser usado dentro de ChatFocusProvider')
  }
  return ctx
}
