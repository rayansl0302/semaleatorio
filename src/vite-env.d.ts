/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL do backend (checkout, Riot OAuth seguro, reCAPTCHA, etc.) */
  readonly VITE_BACKEND_URL?: string
  /** Chave pública reCAPTCHA v2 (widget) — par com RECAPTCHA_SECRET_KEY no backend */
  readonly VITE_RECAPTCHA_SITE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
