import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Firestore,
} from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import type { MessageDoc } from '../types/models'

export function parseFirestoreMessage(id: string, data: Record<string, unknown>): MessageDoc | null {
  const createdAt =
    data.createdAt instanceof Timestamp
      ? data.createdAt
      : data.createdAt != null &&
          typeof data.createdAt === 'object' &&
          'toMillis' in data.createdAt
        ? (data.createdAt as Timestamp)
        : null
  return {
    id,
    threadId: typeof data.threadId === 'string' ? data.threadId : '',
    fromUid: typeof data.fromUid === 'string' ? data.fromUid : '',
    toUid: typeof data.toUid === 'string' ? data.toUid : '',
    text: typeof data.text === 'string' ? data.text : '',
    createdAt,
  }
}

export function subscribeThreadMessagesFs(
  fs: Firestore,
  tid: string,
  cb: (list: MessageDoc[]) => void,
): () => void {
  const q = query(
    collection(fs, 'messages'),
    where('threadId', '==', tid),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(
    q,
    (snap) => {
      const list: MessageDoc[] = []
      snap.forEach((d) => {
        const m = parseFirestoreMessage(d.id, d.data() as Record<string, unknown>)
        if (m) list.push(m)
      })
      cb(list)
    },
    () => cb([]),
  )
}

export async function pushMessageFs(
  fs: Firestore,
  payload: {
    threadId: string
    fromUid: string
    toUid: string
    text: string
  },
): Promise<void> {
  await addDoc(collection(fs, 'messages'), {
    ...payload,
    createdAt: serverTimestamp(),
  })
}

export function subscribeUserMessagesFs(
  fs: Firestore,
  field: 'fromUid' | 'toUid',
  uid: string,
  max: number,
  cb: (list: MessageDoc[]) => void,
): () => void {
  const q = query(
    collection(fs, 'messages'),
    where(field, '==', uid),
    orderBy('createdAt', 'desc'),
    limit(max),
  )
  return onSnapshot(
    q,
    (snap) => {
      const list: MessageDoc[] = []
      snap.forEach((d) => {
        const m = parseFirestoreMessage(d.id, d.data() as Record<string, unknown>)
        if (m) list.push(m)
      })
      cb(list)
    },
    () => cb([]),
  )
}
