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
          snap.forEach((d) =>
            list.push({ id: d.id, ...(d.data() as Omit<PostDoc, 'id'>) }),
          )
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
