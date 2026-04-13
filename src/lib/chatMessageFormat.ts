import type { MessageDoc } from '../types/models'

function toDate(ts: MessageDoc['createdAt']): Date | null {
  if (!ts || typeof ts.toDate !== 'function') return null
  return ts.toDate()
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Rótulo entre mensagens: HOJE, ONTEM, ou data por extenso. */
export function formatChatDaySeparator(d: Date, now = new Date()): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((today.getTime() - msgDay.getTime()) / 86400_000)
  if (diffDays === 0) return 'HOJE'
  if (diffDays === 1) return 'ONTEM'
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Hora curta para dentro da bolha (estilo WhatsApp). */
export function formatMessageBubbleTime(ts: MessageDoc['createdAt']): string {
  const d = toDate(ts)
  if (!d) return ''
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Data + hora em linha (ex.: tooltip ou mensagens sem timestamp Firestore). */
export function formatMessageFullDateTime(ts: MessageDoc['createdAt']): string {
  const d = toDate(ts)
  if (!d) return ''
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function messageNeedsDaySeparator(
  prev: MessageDoc | undefined,
  curr: MessageDoc,
): boolean {
  const dCurr = toDate(curr.createdAt)
  if (!dCurr) return false
  if (!prev) return true
  const dPrev = toDate(prev.createdAt)
  if (!dPrev) return true
  return !isSameCalendarDay(dCurr, dPrev)
}
