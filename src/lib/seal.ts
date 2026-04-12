import type { UserProfile } from '../types/models'

/** Selo SemAleatório: reputação consistente */
export function hasSemiAleatorioSeal(p: Pick<UserProfile, 'ratingAvg' | 'ratingCount'>): boolean {
  return p.ratingCount >= 5 && p.ratingAvg >= 4.2
}
