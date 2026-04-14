import type { PremiumVariant, UserProfile } from '../types/models'

export type { PremiumVariant }

export function isPremiumActive(
  p: Pick<UserProfile, 'plan' | 'premiumUntil'> | null | undefined,
): boolean {
  if (!p || p.plan !== 'premium') return false
  const u = p.premiumUntil
  if (u == null) return false
  if (typeof u.toMillis === 'function') return u.toMillis() > Date.now()
  return false
}

/**
 * Variante efetiva do premium. Contas antigas sem `premiumVariant` contam como completo
 * (comportamento anterior ao split Essencial / Completo).
 */
export function premiumVariantOf(
  p: Pick<UserProfile, 'plan' | 'premiumUntil' | 'premiumVariant'> | null | undefined,
): PremiumVariant | null {
  if (!isPremiumActive(p)) return null
  const v = p?.premiumVariant
  if (v === 'essential' || v === 'complete') return v
  return 'complete'
}

/** Filtros avançados na lista de jogadores, favoritos ilimitados, selo Premium. */
export function hasPremiumEssentialFeatures(
  p: Pick<UserProfile, 'plan' | 'premiumUntil' | 'premiumVariant'> | null | undefined,
): boolean {
  return isPremiumActive(p)
}

/** Estatísticas detalhadas no perfil + registo FCM (notificações push). */
export function hasPremiumCompleteFeatures(
  p: Pick<UserProfile, 'plan' | 'premiumUntil' | 'premiumVariant'> | null | undefined,
): boolean {
  return premiumVariantOf(p) === 'complete'
}
