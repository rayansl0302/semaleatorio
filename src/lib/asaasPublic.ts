/**
 * Indicadores seguros no browser (sem chaves). Localhost → sandbox; produção → live.
 * `VITE_ASAAS_MODE` é só nome técnico da env; não aparece na UI.
 */
export type PaymentGatewayPublicMode = 'sandbox' | 'production'

function isBrowserLocalhostHost(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.localhost')
  )
}

export function resolvePublicPaymentMode(): PaymentGatewayPublicMode {
  if (isBrowserLocalhostHost()) {
    return 'sandbox'
  }
  const v = import.meta.env.VITE_ASAAS_MODE?.trim().toLowerCase()
  if (v === 'sandbox' || v === 'production') return v
  if (typeof window === 'undefined') return 'production'
  return 'production'
}

/** True em localhost / 127.0.0.1 / ::1 — útil para avisos na UI em dev. */
export function isClientPaymentSandbox(): boolean {
  return resolvePublicPaymentMode() === 'sandbox'
}
