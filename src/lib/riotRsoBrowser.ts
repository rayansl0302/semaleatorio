/**
 * RSO no browser (VITE_* — exposto no bundle; só para iterar rápido).
 *
 * CORS: em dev, aponta VITE_RIOT_RSO_TOKEN_URL e VITE_RIOT_RSO_ACCOUNT_ME_URL
 * para os proxies em /__riot-oauth/* (vite.config). Em prod na Vercel, usa
 * /api/riotRsoBrowserProxy (sem Firebase).
 */
import { profileSlugFromNick } from './profileSlug'

export const RSO_LOG_PREFIX = '[SemAleatório RSO]'

const SESSION_KEY = 'semaleatorio_rso_link_v1'

type RsoSession = { state: string; uid: string; exp: number }

function str(v: string | undefined): string {
  return (v ?? '').trim()
}

export function riotRsoBrowserConfigured(): boolean {
  return !!str(import.meta.env.VITE_RIOT_RSO_CLIENT_ID)
}

function redirectUri(): string {
  const fromEnv = str(import.meta.env.VITE_RIOT_RSO_REDIRECT_URI)
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/app/perfil`
  }
  return ''
}

function readSession(): RsoSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as RsoSession
    if (!o.state || !o.uid || typeof o.exp !== 'number') return null
    if (o.exp < Date.now()) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return o
  } catch {
    return null
  }
}

export function buildRiotAuthorizeUrlForBrowser(userUid: string): string {
  const clientId = str(import.meta.env.VITE_RIOT_RSO_CLIENT_ID)
  if (!clientId) {
    throw new Error('Define VITE_RIOT_RSO_CLIENT_ID no .env')
  }
  const ru = redirectUri()
  if (!ru) throw new Error('redirect_uri em falta')

  const state = crypto.randomUUID()
  const exp = Date.now() + 12 * 60 * 1000
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ state, uid: userUid, exp } satisfies RsoSession),
  )

  const scope = str(import.meta.env.VITE_RIOT_RSO_SCOPES) || 'openid'
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: ru,
    response_type: 'code',
    scope,
    state,
  })
  const locales = str(import.meta.env.VITE_RIOT_RSO_UI_LOCALES)
  if (locales) params.set('ui_locales', locales)

  const authorizeUrl = `https://auth.riotgames.com/authorize?${params.toString()}`
  console.info(`${RSO_LOG_PREFIX} authorize pronto`, {
    redirect_uri: ru,
    scope,
    client_id_preview: `${clientId.slice(0, 6)}…`,
    sessionStorage: SESSION_KEY,
  })
  console.info(`${RSO_LOG_PREFIX} window.location.assign → auth.riotgames.com (se não mudar de página, vê bloqueador ou erros abaixo)`)
  return authorizeUrl
}

function tokenUrl(): string {
  return (
    str(import.meta.env.VITE_RIOT_RSO_TOKEN_URL) ||
    'https://auth.riotgames.com/token'
  )
}

function accountMeUrl(): string {
  return (
    str(import.meta.env.VITE_RIOT_RSO_ACCOUNT_ME_URL) ||
    'https://americas.api.riotgames.com/riot/account/v1/accounts/me'
  )
}

/** Diagnóstico no consola (sem imprimir segredos). */
export function logRsoBrowserDiagnostics(phase: string) {
  const cid = str(import.meta.env.VITE_RIOT_RSO_CLIENT_ID)
  const sec = str(import.meta.env.VITE_RIOT_RSO_CLIENT_SECRET)
  const ruConfigured = str(import.meta.env.VITE_RIOT_RSO_REDIRECT_URI)
  const derivedRu =
    typeof window !== 'undefined'
      ? `${window.location.origin}/app/perfil`
      : ''
  const tok = tokenUrl()
  const acc = accountMeUrl()
  console.groupCollapsed(`${RSO_LOG_PREFIX} ${phase}`)
  console.info('modo', import.meta.env.DEV ? 'DEV (Vite)' : 'PROD')
  console.info(
    'VITE_RIOT_RSO_CLIENT_ID',
    cid ? `definido (${cid.length} chars)` : 'EM FALTA — .env + reiniciar Vite (npm run dev)',
  )
  console.info(
    'VITE_RIOT_RSO_CLIENT_SECRET',
    sec ? `definido (${sec.length} chars)` : 'EM FALTA — precisas disto após voltar da Riot',
  )
  console.info(
    'redirect_uri que será enviado à Riot',
    ruConfigured || derivedRu,
    ruConfigured ? '(VITE_RIOT_RSO_REDIRECT_URI)' : '(derivado de window.location)',
  )
  console.info('VITE_RIOT_RSO_TOKEN_URL →', tok)
  console.info('VITE_RIOT_RSO_ACCOUNT_ME_URL →', acc)
  console.info('riotRsoBrowserConfigured()', riotRsoBrowserConfigured())
  console.groupEnd()
}

function isBundledProxy(url: string): boolean {
  return url.includes('riotRsoBrowserProxy')
}

async function exchangeToken(
  formBody: string,
  basicAuthHeader: string | null,
): Promise<Response> {
  const url = tokenUrl()
  if (isBundledProxy(url)) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'token',
        formBody,
        ...(basicAuthHeader ? { authorization: basicAuthHeader } : {}),
      }),
    })
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  if (basicAuthHeader) headers.Authorization = basicAuthHeader
  return fetch(url, { method: 'POST', headers, body: formBody })
}

async function fetchAccountMe(authorization: string): Promise<Response> {
  const url = accountMeUrl()
  if (isBundledProxy(url)) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'account_me', authorization }),
    })
  }
  return fetch(url, { headers: { Authorization: authorization } })
}

export async function completeRiotSsoInBrowser(
  code: string,
  oauthState: string,
): Promise<{ gameName: string; tagLine: string; puuid: string }> {
  console.info(`${RSO_LOG_PREFIX} callback OAuth: a validar sessão (sessionStorage)`)
  const sess = readSession()
  if (!sess || sess.state !== oauthState) {
    console.warn(`${RSO_LOG_PREFIX} sessão inválida`, {
      temSessao: !!sess,
      stateUrl: oauthState,
      stateGuardado: sess?.state,
    })
    throw new Error(
      'Sessão RSO inválida ou expirada. Clica outra vez em “Entrar com conta Riot”.',
    )
  }

  console.info(`${RSO_LOG_PREFIX} a trocar code → token em`, tokenUrl())
  const clientId = str(import.meta.env.VITE_RIOT_RSO_CLIENT_ID)
  const clientSecret = str(import.meta.env.VITE_RIOT_RSO_CLIENT_SECRET)
  const ru = redirectUri()
  if (!clientId || !ru) {
    throw new Error('VITE_RIOT_RSO_CLIENT_ID ou redirect em falta.')
  }
  if (!clientSecret) {
    throw new Error(
      'Para RSO no browser define VITE_RIOT_RSO_CLIENT_SECRET (fluxo Basic). JWT no cliente não está implementado.',
    )
  }

  const body = new URLSearchParams()
  body.set('grant_type', 'authorization_code')
  body.set('code', code)
  body.set('redirect_uri', ru)

  const formStr = body.toString()
  const basic = `Basic ${btoa(`${clientId}:${clientSecret}`)}`

  const tokenRes = await exchangeToken(formStr, basic)
  const tokenJson = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string
    error?: string
    error_description?: string
  }

  if (!tokenRes.ok || !tokenJson.access_token) {
    const msg =
      tokenJson.error_description ??
      tokenJson.error ??
      `Erro ao trocar código RSO (HTTP ${tokenRes.status}).`
    console.error(`${RSO_LOG_PREFIX} falha no token`, {
      status: tokenRes.status,
      error: tokenJson.error,
      error_description: tokenJson.error_description,
    })
    throw new Error(msg)
  }

  console.info(`${RSO_LOG_PREFIX} token OK; a pedir conta em`, accountMeUrl())
  const accRes = await fetchAccountMe(`Bearer ${tokenJson.access_token}`)
  const accJson = (await accRes.json().catch(() => ({}))) as {
    puuid?: string
    gameName?: string
    tagLine?: string
  }

  if (
    !accRes.ok ||
    typeof accJson.puuid !== 'string' ||
    typeof accJson.gameName !== 'string' ||
    typeof accJson.tagLine !== 'string'
  ) {
    console.error(`${RSO_LOG_PREFIX} falha accounts/me`, {
      ok: accRes.ok,
      httpStatus: accRes.status,
      body: accJson,
    })
    throw new Error(
      'Não foi possível ler riot/account/v1/accounts/me. Confirma o scope openid e o proxy CORS.',
    )
  }

  console.info(`${RSO_LOG_PREFIX} conta Riot lida`, {
    gameName: accJson.gameName,
    tagLine: accJson.tagLine,
  })
  sessionStorage.removeItem(SESSION_KEY)

  return {
    gameName: accJson.gameName.trim(),
    tagLine: accJson.tagLine.trim().replace(/^#/, ''),
    puuid: accJson.puuid,
  }
}

export function profilePatchFromRiotAccount(
  gameName: string,
  tagLine: string,
  puuid: string,
  elo: string,
) {
  return {
    nickname: gameName,
    tag: tagLine,
    riotPuuid: puuid,
    elo,
    profileSlug: profileSlugFromNick(gameName, tagLine),
  }
}
