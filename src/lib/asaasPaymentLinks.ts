import { PRODUCT_REF } from './pricing'

type ProductRefValue = (typeof PRODUCT_REF)[keyof typeof PRODUCT_REF]

/**
 * URLs públicas dos Links de pagamento Asaas (copiar do painel ou campo `url` de POST /v3/paymentLinks).
 * Edita **só** as constantes abaixo — não precisa de .env.
 *
 * Opcional: no link, define `callback.successUrl` para `.../app/perfil?pagamento=sucesso` (o perfil
 * actualiza ao voltares do Asaas). Ver script `scripts/fetch-asaas-payment-link-urls.mjs`.
 *
 * @see https://docs.asaas.com/docs/criando-um-link-de-pagamentos
 */
export const URL_PREMIUM_ESSENTIAL = 'https://sandbox.asaas.com/c/ijq2aoj3of0yqtpp'
export const URL_PREMIUM_COMPLETE = 'https://sandbox.asaas.com/c/vxsswfy6h0ftpe70'
/** Sandbox Asaas exige mín. R$ 5,00 por cobrança; o link usa R$ 5 mesmo que a UI mostre outro valor. */
export const URL_BOOST_1H = 'https://sandbox.asaas.com/c/ks6mpi4vba3u92ok'
export const URL_BOOST_2H = 'https://sandbox.asaas.com/c/nnqaw3nuo1yhd9tr'

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

export function hasAsaasPaymentLinksConfigured(): boolean {
  return (Object.keys(ASAAS_PAYMENT_LINKS) as ProductRefValue[]).some((k) => {
    const v = ASAAS_PAYMENT_LINKS[k]?.trim()
    return Boolean(v && /^https?:\/\//i.test(v))
  })
}
