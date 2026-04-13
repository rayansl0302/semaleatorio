/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base onde existem as rotas /api/* (ex.: https://teu-app.vercel.app) */
  readonly VITE_API_URL?: string
  /** Alias de VITE_API_URL */
  readonly VITE_BACKEND_URL?: string
  /** Legado: URL do site com rotas /api na Vercel */
  readonly VITE_VERCEL_API_URL?: string

  /** RSO no browser (expõe segredo no bundle) */
  readonly VITE_RIOT_RSO_CLIENT_ID?: string
  readonly VITE_RIOT_RSO_CLIENT_SECRET?: string
  readonly VITE_RIOT_RSO_REDIRECT_URI?: string
  readonly VITE_RIOT_RSO_SCOPES?: string
  readonly VITE_RIOT_RSO_UI_LOCALES?: string
  readonly VITE_RIOT_RSO_TOKEN_URL?: string
  readonly VITE_RIOT_RSO_ACCOUNT_ME_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
