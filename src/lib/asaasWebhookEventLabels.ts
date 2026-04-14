/**
 * Rótulos PT-BR para `event` dos webhooks Asaas (valor bruto costuma ser SNAKE_CASE).
 * Valores desconhecidos: usa-se `labelAsaasWebhookEventPt` com fallback legível.
 */
export const AsaasWebhookEvent = {
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_AWAITING_RISK_ANALYSIS: 'PAYMENT_AWAITING_RISK_ANALYSIS',
  PAYMENT_APPROVED_BY_RISK_ANALYSIS: 'PAYMENT_APPROVED_BY_RISK_ANALYSIS',
  PAYMENT_REPROVED_BY_RISK_ANALYSIS: 'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
  PAYMENT_AUTHORIZED: 'PAYMENT_AUTHORIZED',
  PAYMENT_UPDATED: 'PAYMENT_UPDATED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
  PAYMENT_ANTICIPATED: 'PAYMENT_ANTICIPATED',
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  PAYMENT_DELETED: 'PAYMENT_DELETED',
  PAYMENT_RESTORED: 'PAYMENT_RESTORED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  PAYMENT_PARTIALLY_REFUNDED: 'PAYMENT_PARTIALLY_REFUNDED',
  PAYMENT_CHARGEBACK_REQUESTED: 'PAYMENT_CHARGEBACK_REQUESTED',
  PAYMENT_CHARGEBACK_DISPUTE: 'PAYMENT_CHARGEBACK_DISPUTE',
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL: 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  PAYMENT_DUNNING_RECEIVED: 'PAYMENT_DUNNING_RECEIVED',
  PAYMENT_DUNNING_REQUESTED: 'PAYMENT_DUNNING_REQUESTED',
  PAYMENT_BANK_SLIP_VIEWED: 'PAYMENT_BANK_SLIP_VIEWED',
  PAYMENT_CHECKOUT_VIEWED: 'PAYMENT_CHECKOUT_VIEWED',
} as const

const LABELS: Record<string, string> = {
  [AsaasWebhookEvent.PAYMENT_CREATED]: 'Cobrança criada',
  [AsaasWebhookEvent.PAYMENT_AWAITING_RISK_ANALYSIS]: 'Pagamento em análise de risco',
  [AsaasWebhookEvent.PAYMENT_APPROVED_BY_RISK_ANALYSIS]: 'Pagamento aprovado (risco)',
  [AsaasWebhookEvent.PAYMENT_REPROVED_BY_RISK_ANALYSIS]: 'Pagamento reprovado (risco)',
  [AsaasWebhookEvent.PAYMENT_AUTHORIZED]: 'Pagamento autorizado',
  [AsaasWebhookEvent.PAYMENT_UPDATED]: 'Pagamento atualizado',
  [AsaasWebhookEvent.PAYMENT_CONFIRMED]: 'Pagamento confirmado',
  [AsaasWebhookEvent.PAYMENT_RECEIVED]: 'Pagamento recebido',
  [AsaasWebhookEvent.PAYMENT_CREDIT_CARD_CAPTURE_REFUSED]: 'Captura no cartão recusada',
  [AsaasWebhookEvent.PAYMENT_ANTICIPATED]: 'Pagamento antecipado',
  [AsaasWebhookEvent.PAYMENT_OVERDUE]: 'Pagamento em atraso',
  [AsaasWebhookEvent.PAYMENT_DELETED]: 'Cobrança eliminada',
  [AsaasWebhookEvent.PAYMENT_RESTORED]: 'Cobrança restaurada',
  [AsaasWebhookEvent.PAYMENT_REFUNDED]: 'Pagamento reembolsado',
  [AsaasWebhookEvent.PAYMENT_PARTIALLY_REFUNDED]: 'Pagamento parcialmente reembolsado',
  [AsaasWebhookEvent.PAYMENT_CHARGEBACK_REQUESTED]: 'Chargeback solicitado',
  [AsaasWebhookEvent.PAYMENT_CHARGEBACK_DISPUTE]: 'Chargeback em disputa',
  [AsaasWebhookEvent.PAYMENT_AWAITING_CHARGEBACK_REVERSAL]: 'Aguardando reversão de chargeback',
  [AsaasWebhookEvent.PAYMENT_DUNNING_RECEIVED]: 'Negativação recebida',
  [AsaasWebhookEvent.PAYMENT_DUNNING_REQUESTED]: 'Negativação solicitada',
  [AsaasWebhookEvent.PAYMENT_BANK_SLIP_VIEWED]: 'Boleto visualizado',
  [AsaasWebhookEvent.PAYMENT_CHECKOUT_VIEWED]: 'Checkout visualizado',
}

/** Texto amigável para a UI; desconhecido → frase derivada do enum. */
export function labelAsaasWebhookEventPt(event: string | undefined): string {
  if (!event?.trim()) return '—'
  const key = event.trim()
  if (LABELS[key]) return LABELS[key]
  return key
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}
