/**
 * URL canônica do site em produção (ex.: https://semaleatorio.gg).
 * LP fica na raiz (/), o produto em /app.
 * Em dev, cai no origin atual.
 */
export function getPublicSiteUrl(): string {
  const env = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim()
  if (env) return env.replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}
