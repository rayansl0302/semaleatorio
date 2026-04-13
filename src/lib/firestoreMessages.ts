import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  type Firestore,
  type FirestoreError,
} from 'firebase/firestore'
import type { MessageDoc } from '../types/models'

function asTimestamp(v: unknown): Timestamp | null {
  if (v instanceof Timestamp) return v
  if (
    v !== null &&
    typeof v === 'object' &&
    'toMillis' in v &&
    typeof (v as { toMillis: unknown }).toMillis === 'function'
  ) {
    return v as Timestamp
  }
  if (
    v !== null &&
    typeof v === 'object' &&
    'seconds' in v &&
    typeof (v as { seconds: unknown }).seconds === 'number'
  ) {
    const o = v as { seconds: number; nanoseconds?: number }
    return new Timestamp(o.seconds, o.nanoseconds ?? 0)
  }
  return null
}

export function parseFirestoreMessage(id: string, data: Record<string, unknown>): MessageDoc {
  const createdAt = asTimestamp(data.createdAt)
  return {
    id,
    threadId: typeof data.threadId === 'string' ? data.threadId : '',
    fromUid: typeof data.fromUid === 'string' ? data.fromUid : '',
    toUid: typeof data.toUid === 'string' ? data.toUid : '',
    text: typeof data.text === 'string' ? data.text : '',
    createdAt,
  }
}

function sortMessages(list: MessageDoc[]): void {
  list.sort((a, b) => {
    const am = a.createdAt?.toMillis?.() ?? 0
    const bm = b.createdAt?.toMillis?.() ?? 0
    if (am !== bm) return am - bm
    return a.id.localeCompare(b.id)
  })
}

/**
 * Duas queries (threadId + fromUid / toUid) em vez de só threadId: assim o Firestore não nega
 * a lista inteira por existir mensagens legadas com o mesmo threadId em que o viewer não participa.
 */
export function subscribeThreadMessagesFs(
  fs: Firestore,
  tid: string,
  viewerUid: string,
  cb: (list: MessageDoc[]) => void,
  onError?: (err: FirestoreError) => void,
): () => void {
  if (!viewerUid) {
    cb([])
    return () => {}
  }

  let sent: MessageDoc[] = []
  let received: MessageDoc[] = []
  let reported = false

  const flush = () => {
    const byId = new Map<string, MessageDoc>()
    for (const m of sent) byId.set(m.id, m)
    for (const m of received) byId.set(m.id, m)
    const list = [...byId.values()]
    sortMessages(list)
    cb(list)
  }

  const qSent = query(
    collection(fs, 'messages'),
    where('threadId', '==', tid),
    where('fromUid', '==', viewerUid),
    orderBy('createdAt', 'asc'),
  )
  const qRecv = query(
    collection(fs, 'messages'),
    where('threadId', '==', tid),
    where('toUid', '==', viewerUid),
    orderBy('createdAt', 'asc'),
  )

  const onErr = (err: FirestoreError) => {
    console.error('[Firestore] subscribeThreadMessagesFs', tid, err.code, err.message)
    if (!reported) {
      reported = true
      onError?.(err)
    }
  }

  const unsub1 = onSnapshot(
    qSent,
    { includeMetadataChanges: true },
    (snap) => {
      sent = []
      snap.forEach((d) => {
        sent.push(parseFirestoreMessage(d.id, d.data() as Record<string, unknown>))
      })
      flush()
    },
    onErr,
  )
  const unsub2 = onSnapshot(
    qRecv,
    { includeMetadataChanges: true },
    (snap) => {
      received = []
      snap.forEach((d) => {
        received.push(parseFirestoreMessage(d.id, d.data() as Record<string, unknown>))
      })
      flush()
    },
    onErr,
  )

  return () => {
    unsub1()
    unsub2()
  }
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
  onError?: (err: FirestoreError) => void,
): () => void {
  const q = query(
    collection(fs, 'messages'),
    where(field, '==', uid),
    orderBy('createdAt', 'desc'),
    limit(max),
  )
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) => {
      const list: MessageDoc[] = []
      snap.forEach((d) => {
        const m = parseFirestoreMessage(d.id, d.data() as Record<string, unknown>)
        list.push(m)
      })
      cb(list)
    },
    (err) => {
      console.error('[Firestore] subscribeUserMessagesFs', field, uid, err.code, err.message)
      onError?.(err)
    },
  )
}
