/** sessionStorage: slug público do indicador (mesmo formato que `/u/:slug`). */
export const SA_REFERRAL_SLUG_SESSION_KEY = 'sa_referral_slug'

export function readPendingReferralSlug(): string | undefined {
  if (typeof sessionStorage === 'undefined') return undefined
  const s = sessionStorage.getItem(SA_REFERRAL_SLUG_SESSION_KEY)?.trim().toLowerCase()
  return s && s.length > 0 ? s : undefined
}

export function clearPendingReferralSlug(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(SA_REFERRAL_SLUG_SESSION_KEY)
}
