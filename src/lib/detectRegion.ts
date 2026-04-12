/** Heurística simples para onboarding BR (produto focado no Brasil). */
export function detectDefaultRegion(): string {
  if (typeof Intl !== 'undefined') {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
    if (
      tz.startsWith('America/Sao_Paulo') ||
      tz.startsWith('America/Fortaleza') ||
      tz.startsWith('America/Recife') ||
      tz.startsWith('America/Belem') ||
      tz.startsWith('America/Manaus') ||
      tz.startsWith('America/Campo_Grande') ||
      tz.startsWith('America/Cuiaba') ||
      tz.startsWith('America/Bahia') ||
      tz.startsWith('America/Noronha')
    ) {
      return 'BR'
    }
  }
  if (typeof navigator !== 'undefined') {
    const lang = (navigator.language || '').toLowerCase()
    if (lang.startsWith('pt')) return 'BR'
  }
  return 'BR'
}
