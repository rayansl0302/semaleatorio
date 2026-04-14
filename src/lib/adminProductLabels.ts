/** Rótulos amigáveis para refs de produto (Asaas / webhook). */
export function adminProductLabel(ref: string): string {
  const m: Record<string, string> = {
    SA_BOOST_1H: 'Boost 1 h',
    SA_BOOST_2H: 'Boost 2 h',
    SA_PREMIUM_ESSENTIAL_30D: 'Premium Essencial',
    SA_PREMIUM_COMPLETE_30D: 'Premium Pro',
  }
  return m[ref] ?? ref
}
