import {
  equalTo,
  limitToLast,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  serverTimestamp,
  set,
  type Database,
} from 'firebase/database'
import { Timestamp } from 'firebase/firestore'
import type { MessageDoc } from '../types/models'

export function parseMessageNode(id: string, val: unknown): MessageDoc | null {
  if (val == null || typeof val !== 'object') return null
  const o = val as Record<string, unknown>
  const createdAt =
    typeof o.createdAt === 'number' && Number.isFinite(o.createdAt)
      ? Timestamp.fromMillis(o.createdAt)
      : null
  return {
    id,
    threadId: typeof o.threadId === 'string' ? o.threadId : '',
    fromUid: typeof o.fromUid === 'string' ? o.fromUid : '',
    toUid: typeof o.toUid === 'string' ? o.toUid : '',
    text: typeof o.text === 'string' ? o.text : '',
    createdAt,
  }
}

export function subscribeThreadMessages(
  rtdb: Database,
  tid: string,
  cb: (list: MessageDoc[]) => void,
): () => void {
  const q = query(
    ref(rtdb, 'messages'),
    orderByChild('threadId'),
    equalTo(tid),
  )
  return onValue(q, (snap) => {
    const list: MessageDoc[] = []
    snap.forEach((child) => {
      const m = parseMessageNode(child.key ?? '', child.val())
      if (m) list.push(m)
    })
    list.sort((a, b) => {
      const ma = a.createdAt?.toMillis() ?? 0
      const mb = b.createdAt?.toMillis() ?? 0
      return ma - mb
    })
    cb(list)
  })
}

export async function pushMessage(
  rtdb: Database,
  payload: {
    threadId: string
    fromUid: string
    toUid: string
    text: string
  },
): Promise<void> {
  const newRef = push(ref(rtdb, 'messages'))
  await set(newRef, {
    ...payload,
    createdAt: serverTimestamp(),
  })
}

/** Mensagens enviadas ou recebidas por um utilizador (últimas `limit`). */
export function subscribeUserMessages(
  rtdb: Database,
  field: 'fromUid' | 'toUid',
  uid: string,
  limit: number,
  cb: (list: MessageDoc[]) => void,
): () => void {
  const q = query(
    ref(rtdb, 'messages'),
    orderByChild(field),
    equalTo(uid),
    limitToLast(limit),
  )
  return onValue(q, (snap) => {
    const list: MessageDoc[] = []
    snap.forEach((child) => {
      const m = parseMessageNode(child.key ?? '', child.val())
      if (m) list.push(m)
    })
    cb(list)
  })
}
