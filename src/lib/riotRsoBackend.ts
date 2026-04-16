/**
 * Cliente para OAuth Riot via backend (sem segredo no bundle).
 * O botão no perfil está desativado até o fluxo estar pronto — voltar a importar em `ProfilePage` quando for lançar.
 */
import { getBackendBaseUrl } from './asaasPublic'

/** Inicia OAuth Riot no servidor (segredo só no backend). */
export async function fetchRiotOAuthAuthorizeUrl(firebaseIdToken: string): Promise<string> {
  const base = getBackendBaseUrl()
  if (!base) {
    throw new Error(
      'Defina VITE_BACKEND_URL no front e configure Riot RSO no .env do backend (RIOT_RSO_*).',
    )
  }

  const res = await fetch(`${base}/api/auth/riot/url`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${firebaseIdToken}` },
  })

  const body = (await res.json().catch(() => ({}))) as {
    message?: string
    error?: string
    authorizeUrl?: string
  }

  if (!res.ok) {
    const msg =
      (typeof body.message === 'string' && body.message) ||
      (typeof body.error === 'string' && body.error) ||
      (res.status === 503 ? 'Riot SSO não configurado no servidor.' : `Erro ${res.status} ao iniciar login Riot.`)
    throw new Error(msg)
  }

  if (typeof body.authorizeUrl !== 'string' || !body.authorizeUrl.trim()) {
    throw new Error('Resposta do servidor incompleta (authorizeUrl).')
  }

  return body.authorizeUrl.trim()
}

export function riotOAuthCallbackMessage(errorCode: string): string {
  const code = errorCode.trim().toLowerCase()
  switch (code) {
    case 'slug_taken':
      return 'Esse nick/tag já está em uso por outro perfil. Escolha outro ou contacte o suporte.'
    case 'invalid_state':
      return 'Sessão de login Riot expirada ou inválida. Tente «Conectar conta Riot» de novo.'
    case 'missing_code_or_state':
      return 'Resposta incompleta da Riot. Tente novamente.'
    case 'firestore_admin_not_configured':
      return 'Servidor sem permissão para gravar o perfil. Verifique FIREBASE_SERVICE_ACCOUNT_JSON no backend.'
    case 'access_denied':
      return 'Login na Riot cancelado ou negado.'
    default:
      if (code === 'link_failed' || !code) {
        return 'Não foi possível vincular a conta Riot. Tente de novo mais tarde.'
      }
      return `Não foi possível concluir o login Riot (${errorCode}).`
  }
}
