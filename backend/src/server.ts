import './loadEnv.js'
import cors from 'cors'
import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { openApiDocument } from './openapi.js'
import { ApiError } from './lib/errors.js'
import { getAdmin, getDb } from './lib/admin.js'
import { requireAuthUser, requireUid } from './lib/auth.js'
import { riotCompleteOAuth, riotPrepareOAuth } from './lib/riotOAuth.js'
import { FetchRankError, fetchRankByRiotId } from './lib/riotRank.js'
import {
  createAsaasCheckoutHandler,
  processAsaasWebhook,
} from './lib/asaasLogic.js'

const app = express()
app.set('trust proxy', 1)
app.use(cors({ origin: true }))
app.use(express.json())

const swaggerEnabled =
  (process.env.SWAGGER_ENABLED ?? '1').trim() !== '0' &&
  String(process.env.NODE_ENV ?? '').toLowerCase() !== 'test'

if (swaggerEnabled) {
  const spec = {
    ...openApiDocument,
    servers: [
      {
        url: (process.env.PUBLIC_API_URL ?? '').replace(/\/$/, '') || '/',
        description: process.env.PUBLIC_API_URL
          ? 'URL pública (PUBLIC_API_URL)'
          : 'Host atual',
      },
    ],
  }
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec as Record<string, unknown>, {
      customSiteTitle: 'SemAleatório API',
    }),
  )
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'semaleatorio-backend' })
})

type Body = { data?: Record<string, unknown> }

function getData(req: express.Request): Record<string, unknown> {
  const b = (req.body ?? {}) as Body
  return (b.data ?? {}) as Record<string, unknown>
}

function asyncPost(
  fn: (req: express.Request, data: Record<string, unknown>) => Promise<unknown>,
) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const data = getData(req)
      const result = await fn(req, data)
      res.json({ result })
    } catch (e) {
      if (e instanceof ApiError) {
        res.status(e.status).json({ error: { code: e.code, message: e.message } })
        return
      }
      console.error(e)
      res.status(500).json({ error: { message: 'Erro interno.' } })
    }
  }
}

app.post('/api/prepareRiotOAuth', asyncPost(async (req) => {
  getAdmin()
  const uid = await requireUid(req)
  return riotPrepareOAuth(uid)
}))

app.post('/api/completeRiotOAuth', asyncPost(async (req, data) => {
  getAdmin()
  const uid = await requireUid(req)
  const code = String(data.code ?? '')
  const state = String(data.state ?? '')
  return riotCompleteOAuth(uid, code, state)
}))

app.post('/api/fetchRiotRank', asyncPost(async (req, data) => {
  getAdmin()
  await requireUid(req)
  const gameName = String(data.gameName ?? '').trim()
  const tagLine = String(data.tagLine ?? '')
    .trim()
    .replace(/^#/, '')
  if (!gameName || !tagLine) {
    throw new ApiError(400, 'invalid-argument', 'Nick e tag obrigatórios.')
  }
  const key = (process.env.RIOT_API_KEY ?? '').trim()
  if (!key) {
    throw new ApiError(
      412,
      'failed-precondition',
      'Defina RIOT_API_KEY no Railway.',
    )
  }
  const platform =
    (process.env.RIOT_PLATFORM_ROUTING ?? 'br1').trim().toLowerCase() || 'br1'
  try {
    return await fetchRankByRiotId(key, gameName, tagLine, platform)
  } catch (e) {
    if (e instanceof FetchRankError) {
      const status =
        e.kind === 'not-found'
          ? 404
          : e.kind === 'failed-precondition'
            ? 412
            : e.kind === 'resource-exhausted'
              ? 429
              : 500
      throw new ApiError(status, e.kind, e.message)
    }
    throw e
  }
}))

app.post('/api/submitRating', asyncPost(async (req, data) => {
  const adm = getAdmin()
  const db = getDb()
  const fromUid = await requireUid(req)
  const toUid = String(data.toUid ?? '')
  const communication = Number(data.communication)
  const skill = Number(data.skill)
  const toxicity = Number(data.toxicity)
  if (!toUid || fromUid === toUid) {
    throw new ApiError(400, 'invalid-argument', 'Alvo inválido.')
  }
  if (
    ![communication, skill, toxicity].every(
      (n) => Number.isInteger(n) && n >= 1 && n <= 5,
    )
  ) {
    throw new ApiError(400, 'invalid-argument', 'Notas entre 1 e 5.')
  }
  const overall = (communication + skill + (6 - toxicity)) / 3

  const userRef = db.doc(`users/${toUid}`)
  const ratingRef = db.collection('ratings').doc()
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists) {
      throw new ApiError(404, 'not-found', 'Usuário não encontrado.')
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
      createdAt: adm.firestore.FieldValue.serverTimestamp(),
    })
    tx.update(userRef, {
      ratingAvg: newAvg,
      ratingCount: count,
      semiAleatorio,
    })
  })
  return { ok: true }
}))

app.post('/api/createAsaasCheckout', asyncPost(async (req, data) => {
  getAdmin()
  const { uid, email, name } = await requireAuthUser(req)
  const product = String(data.product ?? '')
  return createAsaasCheckoutHandler(uid, email, name, product)
}))

app.post('/api/asaasWebhook', async (req, res) => {
  try {
    getAdmin()
    const token = String(req.headers['asaas-access-token'] ?? '')
    const body = (req.body ?? {}) as Record<string, unknown>
    const out = await processAsaasWebhook(token, body)
    res.json(out)
  } catch (e) {
    if (e instanceof ApiError) {
      res.status(e.status).send(e.message)
      return
    }
    console.error('asaasWebhook', e)
    res.status(500).json({ error: 'processing_failed' })
  }
})

const port = Number(process.env.PORT ?? 8787)
app.listen(port, () => {
  console.log(`[semaleatorio-backend] http://0.0.0.0:${port}`)
})
