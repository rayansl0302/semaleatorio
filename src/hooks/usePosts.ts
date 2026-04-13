import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  type Unsubscribe,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase/config'
import type { PostDoc } from '../types/models'

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
    let unsub: Unsubscribe | undefined
    try {
      unsub = onSnapshot(
        q,
        (snap) => {
          const list: PostDoc[] = []
          snap.forEach((d) => {
            const data = d.data() as Partial<Omit<PostDoc, 'id'>>
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
            list.push({
              id: d.id,
              uid: typeof data.uid === 'string' ? data.uid : '',
              title: typeof data.title === 'string' ? data.title : 'Post',
              description:
                typeof data.description === 'string' ? data.description : '',
              eloMin,
              role,
              queueType,
              createdAt: data.createdAt ?? null,
            })
          })
          setPosts(list)
          setError(null)
        },
        (e) => setError(e.message),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro posts')
    }
    return () => unsub?.()
  }, [max])

  return { posts, error }
}
