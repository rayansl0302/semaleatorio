import {
  limitToLast,
  onValue,
  orderByChild,
  query,
  ref,
} from 'firebase/database'
import { Timestamp } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { rtdb } from '../firebase/config'
import type { PostDoc } from '../types/models'

export function usePosts(max = 50) {
  const [posts, setPosts] = useState<PostDoc[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!rtdb) {
      setPosts([])
      return
    }
    const q = query(
      ref(rtdb, 'posts'),
      orderByChild('createdAt'),
      limitToLast(max),
    )
    const unsub = onValue(
      q,
      (snap) => {
        const list: PostDoc[] = []
        snap.forEach((child) => {
          const data = child.val() as Record<string, unknown>
          const eloMin =
            typeof data.eloMin === 'string' && data.eloMin.trim() !== ''
              ? data.eloMin.trim()
              : 'UNRANKED'
          const role =
            typeof data.role === 'string' && data.role.trim() !== ''
              ? data.role.trim()
              : 'MID'
          const queueType =
            data.queueType === 'duo' ||
            data.queueType === 'flex' ||
            data.queueType === 'clash'
              ? data.queueType
              : 'duo'
          const createdAt =
            typeof data.createdAt === 'number' && Number.isFinite(data.createdAt)
              ? Timestamp.fromMillis(data.createdAt)
              : null
          list.push({
            id: child.key ?? '',
            uid: typeof data.uid === 'string' ? data.uid : '',
            title: typeof data.title === 'string' ? data.title : 'Post',
            description:
              typeof data.description === 'string' ? data.description : '',
            eloMin,
            role,
            queueType,
            createdAt,
          })
        })
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
        )
        setPosts(list)
        setError(null)
      },
      (e) => setError(e.message),
    )
    return () => unsub()
  }, [max])

  return { posts, error }
}
