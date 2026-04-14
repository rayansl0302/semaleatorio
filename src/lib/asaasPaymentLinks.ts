import { PRODUCT_REF } from './pricing'

type ProductRefValue = (typeof PRODUCT_REF)[keyof typeof PRODUCT_REF]

type AsaasLinkEnvKey =
  | 'VITE_ASAAS_LINK_PREMIUM_ESSENTIAL'
  | 'VITE_ASAAS_LINK_PREMIUM_COMPLETE'
  | 'VITE_ASAAS_LINK_BOOST_1H'
  | 'VITE_ASAAS_LINK_BOOST_2H'

/** URL pública do link de pagamento na conta Asaas de produção (campo copiado do painel / API). */
function paymentLinkFromEnv(key: AsaasLinkEnvKey): string {
  const v = import.meta.env[key]?.trim()
  if (v && /^https?:\/\//i.test(v)) return v
  return ''
}

/**
 * Links só existem no ambiente em que foram criados: slugs do sandbox não valem em produção.
 * Define cada `VITE_ASAAS_LINK_*` no `.env` com a URL completa do link criado em **asaas.com** (conta real).
 *
 * @see https://docs.asaas.com/docs/criando-um-link-de-pagamentos
 */
export const URL_PREMIUM_ESSENTIAL = paymentLinkFromEnv('VITE_ASAAS_LINK_PREMIUM_ESSENTIAL')
export const URL_PREMIUM_COMPLETE = paymentLinkFromEnv('VITE_ASAAS_LINK_PREMIUM_COMPLETE')
export const URL_BOOST_1H = paymentLinkFromEnv('VITE_ASAAS_LINK_BOOST_1H')
export const URL_BOOST_2H = paymentLinkFromEnv('VITE_ASAAS_LINK_BOOST_2H')

export const ASAAS_PAYMENT_LINKS: Record<ProductRefValue, string> = {
  [PRODUCT_REF.premiumEssential]: URL_PREMIUM_ESSENTIAL,
  [PRODUCT_REF.premiumComplete]: URL_PREMIUM_COMPLETE,
  [PRODUCT_REF.boost1h]: URL_BOOST_1H,
  [PRODUCT_REF.boost2h]: URL_BOOST_2H,
}

export function getAsaasPaymentLinkUrl(productRef: string): string | null {
  const raw = ASAAS_PAYMENT_LINKS[productRef as ProductRefValue]?.trim()
  if (!raw || !/^https?:\/\//i.test(raw)) return null
  return raw
}
