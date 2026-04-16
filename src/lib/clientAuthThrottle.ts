/**
 * Mitigação leve no cliente (mesmo IP/browser). Não substitui rate limit no servidor nem App Check.
 * Persistido em sessionStorage — limpa ao fechar o separador.
 */
const STORAGE_KEY = 'sa_client_auth_throttle_v1'

const AUTH_FAIL_WINDOW_MS = 15 * 60 * 1000
const AUTH_FAIL_MAX = 5

const RESET_WINDOW_MS = 10 * 60 * 1000
const RESET_MAX = 3

type Store = {
  /** Timestamps de falhas em login/registo (e-mail ou Google). */
  authFailures: number[]
  /** Timestamps de pedidos de recuperação de senha bem-sucedidos. */
  passwordResetOk: number[]
}

function load(): Store {
  if (typeof sessionStorage === 'undefined') {
    return { authFailures: [], passwordResetOk: [] }
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { authFailures: [], passwordResetOk: [] }
    const o = JSON.parse(raw) as Record<string, unknown>
    const authFailures = Array.isArray(o.authFailures)
      ? o.authFailures.filter((x): x is number => typeof x === 'number')
      : []
    const passwordResetOk = Array.isArray(o.passwordResetOk)
      ? o.passwordResetOk.filter((x): x is number => typeof x === 'number')
      : []
    return { authFailures, passwordResetOk }
  } catch {
    return { authFailures: [], passwordResetOk: [] }
  }
}

function save(s: Store): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* quota / modo privado */
  }
}

function prune(ts: number[], windowMs: number, now: number): number[] {
  return ts.filter((t) => now - t < windowMs)
}

export function getAuthAttemptBlock(): { blocked: boolean; retryAfterMs: number } {
  const now = Date.now()
  const s = load()
  const recent = prune(s.authFailures, AUTH_FAIL_WINDOW_MS, now).sort((a, b) => a - b)
  if (recent.length < AUTH_FAIL_MAX) {
    return { blocked: false, retryAfterMs: 0 }
  }
  const oldestInWindow = recent[0]
  const retryAfterMs = Math.max(0, oldestInWindow + AUTH_FAIL_WINDOW_MS - now)
  return { blocked: retryAfterMs > 0, retryAfterMs }
}

export function recordAuthAttemptFailure(): void {
  const now = Date.now()
  const s = load()
  const recent = prune(s.authFailures, AUTH_FAIL_WINDOW_MS, now)
  recent.push(now)
  s.authFailures = recent.slice(-24)
  save(s)
}

export function clearAuthAttemptFailures(): void {
  const s = load()
  s.authFailures = []
  save(s)
}

export function shouldCountAuthFailure(code: string | undefined): boolean {
  if (!code) return true
  if (
    code === 'auth/network-request-failed' ||
    code === 'auth/too-many-requests' ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request'
  ) {
    return false
  }
  return true
}

export function getPasswordResetBlock(): { blocked: boolean; retryAfterMs: number } {
  const now = Date.now()
  const s = load()
  const recent = prune(s.passwordResetOk, RESET_WINDOW_MS, now).sort((a, b) => a - b)
  if (recent.length < RESET_MAX) {
    return { blocked: false, retryAfterMs: 0 }
  }
  const oldestInWindow = recent[0]
  const retryAfterMs = Math.max(0, oldestInWindow + RESET_WINDOW_MS - now)
  return { blocked: retryAfterMs > 0, retryAfterMs }
}

export function recordPasswordResetSent(): void {
  const now = Date.now()
  const s = load()
  const recent = prune(s.passwordResetOk, RESET_WINDOW_MS, now)
  recent.push(now)
  s.passwordResetOk = recent.slice(-12)
  save(s)
}

export function formatRetryWaitPt(retryAfterMs: number): string {
  const s = Math.ceil(retryAfterMs / 1000)
  if (s < 60) return `${s} segundos`
  const m = Math.ceil(s / 60)
  return m === 1 ? '1 minuto' : `${m} minutos`
}
