import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { config as loadEnv } from 'dotenv'
import * as admin from 'firebase-admin'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { FetchRankError, fetchRankByRiotId } from './riotRank.js'

/** Gen2: preflight CORS do browser exige invoker público; auth continua via token no corpo. */
const callableOpts = {
  region: 'us-central1' as const,
  invoker: 'public' as const,
  cors: true as const,
}

/** Carrega .env da raiz do repo e/ou functions/ (emulador e deploy local). */
function loadEnvFromDotenv() {
  const cwd = process.cwd()
  const files =
    basename(cwd) === 'functions'
      ? [join(cwd, '..', '.env'), join(cwd, '.env')]
      : [join(cwd, '.env'), join(cwd, 'functions', '.env')]
  for (const file of files) {
    if (existsSync(file)) {
      loadEnv({ path: file, override: true })
    }
  }
}
loadEnvFromDotenv()

admin.initializeApp()
const db = admin.firestore()

export const fetchRiotRank = onCall(callableOpts, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Faça login.')
  }
  const gameName = String(request.data?.gameName ?? '').trim()
  const tagLine = String(request.data?.tagLine ?? '').trim().replace(/^#/, '')
  if (!gameName || !tagLine) {
    throw new HttpsError('invalid-argument', 'Nick e tag obrigatórios.')
  }
  const key = (process.env.RIOT_API_KEY ?? '').trim()
  if (!key) {
    throw new HttpsError(
      'failed-precondition',
      'Defina RIOT_API_KEY no .env (raiz ou functions/) ou nas variáveis de ambiente da função no Google Cloud.',
    )
  }

  const platform =
    (process.env.RIOT_PLATFORM_ROUTING ?? 'br1').trim().toLowerCase() || 'br1'

  try {
    const { elo, puuid } = await fetchRankByRiotId(
      key,
      gameName,
      tagLine,
      platform,
    )
    return { elo, puuid }
  } catch (e) {
    if (e instanceof FetchRankError) {
      throw new HttpsError(e.kind, e.message)
    }
    throw e
  }
})

export const submitRating = onCall(callableOpts, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Faça login.')
  }
  const fromUid = request.auth.uid
  const toUid = String(request.data?.toUid ?? '')
  const communication = Number(request.data?.communication)
  const skill = Number(request.data?.skill)
  const toxicity = Number(request.data?.toxicity)
  if (!toUid || fromUid === toUid) {
    throw new HttpsError('invalid-argument', 'Alvo inválido.')
  }
  if (
    ![communication, skill, toxicity].every(
      (n) => Number.isInteger(n) && n >= 1 && n <= 5,
    )
  ) {
    throw new HttpsError('invalid-argument', 'Notas entre 1 e 5.')
  }
  const overall = (communication + skill + (6 - toxicity)) / 3

  const userRef = db.doc(`users/${toUid}`)
  const ratingRef = db.collection('ratings').doc()
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Usuário não encontrado.')
    }
    const cur = snap.data() as { ratingAvg?: number; ratingCount?: number }
    const prevN = cur.ratingCount ?? 0
    const prevAvg = cur.ratingAvg ?? 0
    const count = prevN + 1
    const newAvg = prevN === 0 ? overall : (prevAvg * prevN + overall) / count
    const semiAleatorio = count >= 5 && newAvg >= 4.2
    tx.set(ratingRef, {
      fromUid,
      toUid,
      communication,
      skill,
      toxicity,
      overall,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    tx.update(userRef, {
      ratingAvg: newAvg,
      ratingCount: count,
      semiAleatorio,
    })
  })

  return { ok: true }
})

export { asaasWebhook, createAsaasCheckout } from './asaas.js'
