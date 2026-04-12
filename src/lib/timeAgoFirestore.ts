import type { Timestamp } from 'firebase/firestore'

/** Texto curto para “há quanto tempo” a partir de lastOnline do Firestore. */
export function formatLastSeenAgo(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toMillis !== 'function') return 'sem registro'
  const ms = Date.now() - ts.toMillis()
  if (ms < 45_000) return 'agora'
  if (ms < 3600_000) return `há ${Math.max(1, Math.floor(ms / 60_000))} min`
  if (ms < 86400_000) return `há ${Math.floor(ms / 3600_000)} h`
  if (ms < 7 * 86400_000) return `há ${Math.floor(ms / 86400_000)} ${Math.floor(ms / 86400_000) === 1 ? 'dia' : 'dias'}`
  return `há ${Math.floor(ms / 86400_000)} d`
}

export function isRecentlyActive(
  ts: Timestamp | null | undefined,
  maxMs = 5 * 60_000,
): boolean {
  if (!ts || typeof ts.toMillis !== 'function') return false
  return Date.now() - ts.toMillis() < maxMs
}
