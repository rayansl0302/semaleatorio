/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** RSO no browser (expõe segredo no bundle) — quando a Riot aprovar */
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
