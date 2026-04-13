import { randomBytes } from 'node:crypto'
import type { firestore } from 'firebase-admin'
import { ApiError } from './errors.js'
import { getAdmin, getDb } from './admin.js'
import {
  RIOT_AUTH_BASE_URL,
  regionalRiotApiBaseUrl,
} from './riotEndpoints.js'
import { FetchRankError, fetchRankByRiotId } from './riotRank.js'

const TOKEN_URL = `${RIOT_AUTH_BASE_URL}/token`

function accountsMeUrl(): string {
  return `${regionalRiotApiBaseUrl()}/riot/account/v1/accounts/me`
}

const STATE_COLLECTION = 'riot_oauth_states'
const STATE_TTL_MS = 15 * 60 * 1000

function profileSlugFromNick(nickname: string, tag: string): string {
  const n = nickname
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const t = tag
    .trim()
    .toLowerCase()
    .replace(/^#/, '')
    .replace(/[^a-z0-9]+/g, '')
  const base = [n || 'invocador', t || 'br1'].join('-')
  return base.replace(/-+/g, '-')
}

function buildAuthorizeUrl(opts: {
  clientId: string
  redirectUri: string
  state: string
}): string {
  const u = new URL(`${RIOT_AUTH_BASE_URL}/authorize`)
  u.searchParams.set('client_id', opts.clientId)
  u.searchParams.set('redirect_uri', opts.redirectUri)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('scope', 'openid offline_access cpid')
  u.searchParams.set('state', opts.state)
  return u.toString()
}

async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string }> {
  const basic = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString(
    'base64',
  )
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new ApiError(
      403,
      'permission-denied',
      `Riot recusou a troca do código (HTTP ${res.status}). Verifique redirect_uri e client. ${text.slice(0, 240)}`,
    )
  }
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) {
    throw new ApiError(500, 'internal', 'Resposta da Riot sem access_token.')
  }
  return { access_token: json.access_token }
}

type AccountMe = {
  puuid?: string
  gameName?: string
  tagLine?: string
}

async function fetchAccountMe(accessToken: string): Promise<AccountMe> {
  const res = await fetch(accountsMeUrl(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new ApiError(
      500,
      'internal',
      `Conta Riot (accounts/me) falhou (HTTP ${res.status}). ${text.slice(0, 200)}`,
    )
  }
  return (await res.json()) as AccountMe
}

function requireOAuthEnv() {
  const clientId = (process.env.RIOT_OAUTH_CLIENT_ID ?? '').trim()
  const clientSecret = (process.env.RIOT_OAUTH_CLIENT_SECRET ?? '').trim()
  const redirectUri = (process.env.RIOT_OAUTH_REDIRECT_URI ?? '').trim()
  if (!clientId || !clientSecret || !redirectUri) {
    throw new ApiError(
      412,
      'failed-precondition',
      'Defina RIOT_OAUTH_CLIENT_ID, RIOT_OAUTH_CLIENT_SECRET e RIOT_OAUTH_REDIRECT_URI no backend (.env local ou Railway). O redirect deve coincidir com o registado na consola Riot (ex.: http://localhost:5173/app/riot-callback).',
    )
  }
  return { clientId, clientSecret, redirectUri }
}

export async function riotPrepareOAuth(uid: string): Promise<{ url: string }> {
  const { clientId, redirectUri } = requireOAuthEnv()
  const state = randomBytes(24).toString('hex')
  const db = getDb()
  const adm = getAdmin()
  const expiresAt = adm.firestore.Timestamp.fromMillis(Date.now() + STATE_TTL_MS)
  try {
    await db.collection(STATE_COLLECTION).doc(state).set({
      uid,
      expiresAt,
      createdAt: adm.firestore.FieldValue.serverTimestamp(),
    })
  } catch (e) {
    console.error('[riotPrepareOAuth] Firestore', e)
    const detail = e instanceof Error ? e.message : String(e)
    throw new ApiError(
      500,
      'internal',
      `Não foi possível gravar o estado OAuth no Firestore. Confirme o projeto da conta de serviço e que a API Firestore está ativa. ${detail}`,
    )
  }
  const url = buildAuthorizeUrl({ clientId, redirectUri, state })
  return { url }
}

export async function riotCompleteOAuth(
  uid: string,
  code: string,
  state: string,
): Promise<{ gameName: string; tagLine: string; puuid: string; elo?: string }> {
  const { clientId, clientSecret, redirectUri } = requireOAuthEnv()
  const trimmedCode = String(code ?? '').trim()
  const trimmedState = String(state ?? '').trim()
  if (!trimmedCode || !trimmedState) {
    throw new ApiError(400, 'invalid-argument', 'code e state são obrigatórios.')
  }

  const db = getDb()
  const stateRef = db.collection(STATE_COLLECTION).doc(trimmedState)
  const snap = await stateRef.get()
  if (!snap.exists) {
    throw new ApiError(
      403,
      'permission-denied',
      'State inválido ou expirado. Inicie o login de novo.',
    )
  }
  const data = snap.data() as { uid?: string; expiresAt?: firestore.Timestamp }
  if (data.uid !== uid) {
    await stateRef.delete().catch(() => {})
    throw new ApiError(
      403,
      'permission-denied',
      'Conta logada não corresponde ao fluxo OAuth.',
    )
  }
  const exp = data.expiresAt?.toMillis() ?? 0
  if (exp < Date.now()) {
    await stateRef.delete().catch(() => {})
    throw new ApiError(408, 'deadline-exceeded', 'Login Riot expirou. Tente de novo.')
  }

  await stateRef.delete()

  const { access_token } = await exchangeAuthorizationCode(
    trimmedCode,
    redirectUri,
    clientId,
    clientSecret,
  )
  const acc = await fetchAccountMe(access_token)
  const puuid = (acc.puuid ?? '').trim()
  const gameName = (acc.gameName ?? '').trim()
  const tagLine = (acc.tagLine ?? '').trim()
  if (!puuid || !gameName || !tagLine) {
    throw new ApiError(
      412,
      'failed-precondition',
      'A Riot não devolveu Riot ID completo (gameName/tag).',
    )
  }

  const userRef = db.doc(`users/${uid}`)
  const slug = profileSlugFromNick(gameName, tagLine)
  const patch: Record<string, unknown> = {
    nickname: gameName,
    tag: tagLine,
    riotPuuid: puuid,
    profileSlug: slug,
  }

  let elo: string | undefined
  const apiKey = (process.env.RIOT_API_KEY ?? '').trim()
  const platform =
    (process.env.RIOT_PLATFORM_ROUTING ?? 'br1').trim().toLowerCase() || 'br1'
  if (apiKey) {
    try {
      const rank = await fetchRankByRiotId(apiKey, gameName, tagLine, platform)
      elo = rank.elo
      patch.elo = rank.elo
    } catch (e) {
      if (e instanceof FetchRankError && e.kind === 'not-found') {
        patch.elo = 'UNRANKED'
        elo = 'UNRANKED'
      }
    }
  }

  await userRef.set(patch, { merge: true })

  return { gameName, tagLine, puuid, elo }
}
