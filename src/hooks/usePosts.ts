import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase/config'
import type { PostDoc } from '../types/models'
import type { QueueType } from '../types/models'

export function usePosts(max = 50) {
  const [posts, setPosts] = useState<PostDoc[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) {
      setPosts([])
      return
    }
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(max),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: PostDoc[] = []
        snap.forEach((d) => {
          const data = d.data() as Record<string, unknown>
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
              ? (data.queueType as QueueType)
              : 'duo'
          const createdAt =
            data.createdAt &&
            typeof data.createdAt === 'object' &&
            'toMillis' in (data.createdAt as object)
              ? (data.createdAt as PostDoc['createdAt'])
              : null
          list.push({
            id: d.id,
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
        setPosts(list)
        setError(null)
      },
      (e) => setError(e.message),
    )
    return () => unsub()
  }, [max])

  return { posts, error }
}
