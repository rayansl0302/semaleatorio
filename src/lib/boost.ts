import { Timestamp } from 'firebase/firestore'

/** Estende o destaque: soma a partir de max(agora, fim atual). */
export function extendBoostUntil(
  current: Timestamp | null | undefined,
  addMs: number,
  nowMs = Date.now(),
): Timestamp {
  const curEnd =
    current && typeof current.toMillis === 'function' ? current.toMillis() : 0
  const base = Math.max(nowMs, curEnd)
  return Timestamp.fromMillis(base + addMs)
}
