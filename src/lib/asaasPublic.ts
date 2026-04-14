/**
 * O front usa apenas checkout Asaas em produção (links `www.asaas.com` via env).
 * Mantido para compatibilidade com imports existentes.
 */
export type PaymentGatewayPublicMode = 'production'

export function resolvePublicPaymentMode(): PaymentGatewayPublicMode {
  return 'production'
}

/** Sempre false — sandbox não é usado no front. */
export function isClientPaymentSandbox(): boolean {
  return false
}
