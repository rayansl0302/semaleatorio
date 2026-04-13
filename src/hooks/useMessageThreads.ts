import { useEffect, useState } from 'react'
import { rtdb } from '../firebase/config'
import { subscribeUserMessages } from '../lib/rtdbMessages'
import { threadIdFor } from '../lib/messages'
import type { MessageDoc } from '../types/models'

export type MessageThreadRow = {
  threadId: string
  peerUid: string
  lastText: string
  lastAt: MessageDoc['createdAt']
}

function millis(t: MessageDoc['createdAt']): number {
  return t && typeof t.toMillis === 'function' ? t.toMillis() : 0
}

function buildThreads(myUid: string, docs: MessageDoc[]): MessageThreadRow[] {
  const best = new Map<string, MessageDoc>()
  for (const m of docs) {
    const peer = m.fromUid === myUid ? m.toUid : m.fromUid
    const tid = m.threadId || threadIdFor(myUid, peer)
    const cur = best.get(tid)
    if (!cur || millis(m.createdAt) > millis(cur.createdAt)) best.set(tid, m)
  }
  return [...best.values()]
    .sort((a, b) => millis(b.createdAt) - millis(a.createdAt))
    .map((m) => {
      const peerUid = m.fromUid === myUid ? m.toUid : m.fromUid
      return {
        threadId: m.threadId || threadIdFor(myUid, peerUid),
        peerUid,
        lastText: m.text,
        lastAt: m.createdAt,
      }
    })
}

export function useMessageThreads(myUid: string | undefined) {
  const [threads, setThreads] = useState<MessageThreadRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!rtdb || !myUid) {
      setThreads([])
      setError(null)
      return
    }

    let sent: MessageDoc[] = []
    let recv: MessageDoc[] = []

    const flush = () => {
      setThreads(buildThreads(myUid, [...sent, ...recv]))
      setError(null)
    }

    const unsubSent = subscribeUserMessages(
      rtdb,
      'fromUid',
      myUid,
      80,
      (list) => {
        sent = list
        flush()
      },
    )
    const unsubRecv = subscribeUserMessages(
      rtdb,
      'toUid',
      myUid,
      80,
      (list) => {
        recv = list
        flush()
      },
    )

    return () => {
      unsubSent()
      unsubRecv()
    }
  }, [myUid])

  return { threads, error }
}
