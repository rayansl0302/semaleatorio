import { PRODUCT_REF } from './pricing'

type ProductRefValue = (typeof PRODUCT_REF)[keyof typeof PRODUCT_REF]

type AsaasLinkEnvKey =
  | 'VITE_ASAAS_LINK_PREMIUM_ESSENTIAL'
  | 'VITE_ASAAS_LINK_PREMIUM_COMPLETE'
  | 'VITE_ASAAS_LINK_BOOST_1H'
  | 'VITE_ASAAS_LINK_BOOST_2H'

function paymentLinkFromEnvOnly(key: AsaasLinkEnvKey): string {
  const v = import.meta.env[key]?.trim()
  if (!v || !/^https?:\/\//i.test(v)) return ''
  return v
}

/** Bloqueia só hosts conhecidos de homologação; produção pode usar www, pay ou outros domínios Asaas. */
function isSandboxAsaasCheckoutHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host === 'sandbox.asaas.com' || host.endsWith('.sandbox.asaas.com')
  } catch {
    return true
  }
}

/**
 * URLs dos links de pagamento Asaas **produção** — obrigatório: `VITE_ASAAS_LINK_*` no `.env`
 * (ex.: `https://www.asaas.com/c/...` copiado do painel). Sem fallback para sandbox.
 *
 * @see https://docs.asaas.com/docs/criando-um-link-de-pagamentos
 */
export const URL_PREMIUM_ESSENTIAL = paymentLinkFromEnvOnly('VITE_ASAAS_LINK_PREMIUM_ESSENTIAL')
export const URL_PREMIUM_COMPLETE = paymentLinkFromEnvOnly('VITE_ASAAS_LINK_PREMIUM_COMPLETE')
export const URL_BOOST_1H = paymentLinkFromEnvOnly('VITE_ASAAS_LINK_BOOST_1H')
export const URL_BOOST_2H = paymentLinkFromEnvOnly('VITE_ASAAS_LINK_BOOST_2H')

export const ASAAS_PAYMENT_LINKS: Record<ProductRefValue, string> = {
  [PRODUCT_REF.premiumEssential]: URL_PREMIUM_ESSENTIAL,
  [PRODUCT_REF.premiumComplete]: URL_PREMIUM_COMPLETE,
  [PRODUCT_REF.boost1h]: URL_BOOST_1H,
  [PRODUCT_REF.boost2h]: URL_BOOST_2H,
}

export function getAsaasPaymentLinkUrl(productRef: string): string | null {
  const raw = ASAAS_PAYMENT_LINKS[productRef as ProductRefValue]?.trim()
  if (!raw || !/^https?:\/\//i.test(raw)) return null
  if (isSandboxAsaasCheckoutHost(raw)) return null
  return raw
}
