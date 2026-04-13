/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base onde existem as rotas /api/* (ex.: https://teu-app.vercel.app) */
  readonly VITE_API_URL?: string
  /** Alias de VITE_API_URL */
  readonly VITE_BACKEND_URL?: string
  /** Legado: URL do site com rotas /api na Vercel */
  readonly VITE_VERCEL_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
