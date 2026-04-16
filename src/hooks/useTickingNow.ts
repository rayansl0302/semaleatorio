import { useEffect, useState } from 'react'

/** Atualiza `Date.now()` em intervalos — útil para cortar TTL (ex.: posts no feed) sem recarregar. */
export function useTickingNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now())
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}
