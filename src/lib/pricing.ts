/** Valores em centavos (BRL) — alinhar com cobranças / webhook do gateway (PIX, cartão crédito/débito). */
export const PRICE_PREMIUM_ESSENTIAL_CENTS = 1990
export const PRICE_PREMIUM_COMPLETE_CENTS = 2990
export const PRICE_BOOST_1H_CENTS = 500
export const PRICE_BOOST_2H_CENTS = 800

export const PREMIUM_SUBSCRIPTION_DAYS = 30

export const BOOST_1H_MS = 60 * 60 * 1000
export const BOOST_2H_MS = 2 * 60 * 60 * 1000

/** Referência externa para webhook / checkout (ex.: externalReference). */
export const PRODUCT_REF = {
  premiumEssential: 'SA_PREMIUM_ESSENTIAL_30D',
  premiumComplete: 'SA_PREMIUM_COMPLETE_30D',
  boost1h: 'SA_BOOST_1H',
  boost2h: 'SA_BOOST_2H',
} as const

export function formatBrlFromCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/** Preço de referência em R$ (sem centavos fracionários) para UI quando o webhook não gravou `value`. */
export function catalogPriceBrlFromProductRef(productRef: string | undefined): number | undefined {
  if (!productRef) return undefined
  switch (productRef) {
    case PRODUCT_REF.premiumEssential:
      return PRICE_PREMIUM_ESSENTIAL_CENTS / 100
    case PRODUCT_REF.premiumComplete:
      return PRICE_PREMIUM_COMPLETE_CENTS / 100
    case PRODUCT_REF.boost1h:
      return PRICE_BOOST_1H_CENTS / 100
    case PRODUCT_REF.boost2h:
      return PRICE_BOOST_2H_CENTS / 100
    default:
      return undefined
  }
}
