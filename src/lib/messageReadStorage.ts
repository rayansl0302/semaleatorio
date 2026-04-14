const STORAGE_KEY = 'semaleatorio_thread_read_v1'

export type ThreadReadMap = Record<string, number>

export function loadThreadReadMap(): ThreadReadMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return {}
    const out: ThreadReadMap = {}
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

export function saveThreadReadMap(map: ThreadReadMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* quota / private mode */
  }
}
