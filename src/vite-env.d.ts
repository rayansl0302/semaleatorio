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
  /** Links de checkout Asaas produção (https://www.asaas.com/c/...) — obrigatórios no .env */
  readonly VITE_ASAAS_LINK_PREMIUM_ESSENTIAL?: string
  readonly VITE_ASAAS_LINK_PREMIUM_COMPLETE?: string
  readonly VITE_ASAAS_LINK_BOOST_1H?: string
  readonly VITE_ASAAS_LINK_BOOST_2H?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
