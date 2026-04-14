import type { QuerySnapshot } from 'firebase/firestore'
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { coerceAmountBrl } from '../lib/coerceAmountBrl'
import { db } from '../firebase/config'

export type UserWebhookEventRow = {
  id: string
  event?: string
  eventId?: string
  productRef?: string
  value?: number
  processedAtMs: number
  atLabel: string
}

function processedMs(x: { processedAt?: { toMillis?: () => number; toDate?: () => Date } }): number {
  const t = x.processedAt
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (typeof t.toDate === 'function') return t.toDate().getTime()
  return 0
}

function rowFromDoc(
  d: import('firebase/firestore').QueryDocumentSnapshot,
): UserWebhookEventRow {
  const x = d.data() as {
    event?: string
    eventId?: string
    productRef?: string
    value?: unknown
    processedAt?: { toMillis?: () => number; toDate?: () => Date }
  }
  const processedAtMs = processedMs(x)
  const value = coerceAmountBrl(x.value)
  return {
    id: d.id,
    event: x.event,
    eventId: x.eventId,
    productRef: x.productRef,
    value,
    processedAtMs,
    atLabel:
      processedAtMs > 0 ? new Date(processedAtMs).toLocaleString('pt-BR') : '—',
  }
}

function isIndexError(e: { code?: string; message?: string }): boolean {
  if (e.code === 'failed-precondition') return true
  const m = (e.message ?? '').toLowerCase()
  return m.includes('index') && (m.includes('create') || m.includes('requires'))
}

/** Histórico de `webhook_events` por UID (índice uid + processedAt; fallback silencioso se índice em construção). */
export function useUserWebhookEvents(uid: string | null, max = 50) {
  const [rows, setRows] = useState<UserWebhookEventRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db || !uid) {
      setRows([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const fs = db
    let unsub: (() => void) | undefined

    const applyIndexedSnap = (snap: QuerySnapshot) => {
      const list: UserWebhookEventRow[] = []
      snap.forEach((d) => list.push(rowFromDoc(d)))
      setRows(list)
      setLoading(false)
      setError(null)
    }

    const startFallback = () => {
      unsub?.()
      const qFb = query(
        collection(fs, 'webhook_events'),
        orderBy('processedAt', 'desc'),
        limit(600),
      )
      unsub = onSnapshot(
        qFb,
        (snap) => {
          const list: UserWebhookEventRow[] = []
          snap.forEach((d) => {
            const data = d.data() as { uid?: string }
            if (data.uid !== uid) return
            list.push(rowFromDoc(d))
          })
          list.sort((a, b) => b.processedAtMs - a.processedAtMs)
          setRows(list.slice(0, max))
          setLoading(false)
          setError(null)
        },
        (e2) => {
          setError(e2.message)
          setRows([])
          setLoading(false)
        },
      )
    }

    const qIndexed = query(
      collection(fs, 'webhook_events'),
      where('uid', '==', uid),
      orderBy('processedAt', 'desc'),
      limit(max),
    )

    unsub = onSnapshot(
      qIndexed,
      applyIndexedSnap,
      (e) => {
        if (isIndexError(e)) {
          startFallback()
          return
        }
        setError(e.message)
        setRows([])
        setLoading(false)
      },
    )

    return () => {
      unsub?.()
    }
  }, [uid, max])

  return { rows, loading, error }
}
