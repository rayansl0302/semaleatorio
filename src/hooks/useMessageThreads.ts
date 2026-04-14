import { useEffect, useMemo, useState } from 'react'
import { db } from '../firebase/config'
import { subscribeUserMessagesFs } from '../lib/firestoreMessages'
import { threadIdFor } from '../lib/messages'
import type { MessageDoc } from '../types/models'

function millis(m: MessageDoc): number {
  return m.createdAt?.toMillis?.() ?? 0
}

export function useMessageThreads(myUid: string | undefined) {
  const [fromList, setFromList] = useState<MessageDoc[]>([])
  const [toList, setToList] = useState<MessageDoc[]>([])

  useEffect(() => {
    if (!db || !myUid) {
      setFromList([])
      setToList([])
      return
    }
    const lim = 120
    const u1 = subscribeUserMessagesFs(db, 'fromUid', myUid, lim, setFromList)
    const u2 = subscribeUserMessagesFs(db, 'toUid', myUid, lim, setToList)
    return () => {
      u1()
      u2()
    }
  }, [myUid])

  const threads = useMemo(() => {
    const best = new Map<string, MessageDoc>()
    const consider = (m: MessageDoc) => {
      const tid =
        m.threadId ||
        threadIdFor(m.fromUid, m.toUid)
      const cur = best.get(tid)
      if (!cur || millis(m) > millis(cur)) best.set(tid, m)
    }
    for (const m of fromList) consider(m)
    for (const m of toList) consider(m)
    return [...best.entries()]
      .sort((a, b) => millis(b[1]) - millis(a[1]))
      .map(([tid, last]) => {
        const peerUid =
          last.fromUid === myUid ? last.toUid : last.fromUid
        return {
          threadId: tid,
          last,
          peerUid,
          lastAt: last.createdAt,
          lastText: typeof last.text === 'string' ? last.text : '',
        }
      })
  }, [fromList, toList, myUid])

  return { threads, fromList, toList }
}
