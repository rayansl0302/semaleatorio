import type { UserProfile } from '../types/models'

export function isPremiumActive(
  p: Pick<UserProfile, 'plan' | 'premiumUntil'> | null | undefined,
): boolean {
  if (!p || p.plan !== 'premium') return false
  const u = p.premiumUntil
  if (u == null) return true
  if (typeof u.toMillis === 'function') return u.toMillis() > Date.now()
  return true
}
