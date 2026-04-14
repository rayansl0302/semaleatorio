import type { UserProfile } from '../types/models'
import { isPremiumActive, premiumVariantOf } from './plan'

/**
 * Detecta quando o perfil ganhou benefício (ex.: webhook Asaas gravou no Firestore).
 * Compara snapshot anterior vs novo do mesmo utilizador.
 */
export function detectProfileBenefitUpgrade(
  prev: UserProfile | null,
  next: UserProfile,
): 'premium' | 'boost' | null {
  if (!prev) return null
  if (!isPremiumActive(prev) && isPremiumActive(next)) return 'premium'
  if (
    isPremiumActive(prev) &&
    isPremiumActive(next) &&
    premiumVariantOf(prev) === 'essential' &&
    premiumVariantOf(next) === 'complete'
  ) {
    return 'premium'
  }
  const pb = prev.boostUntil?.toMillis?.() ?? 0
  const nb = next.boostUntil?.toMillis?.() ?? 0
  if (nb > pb) return 'boost'
  return null
}
