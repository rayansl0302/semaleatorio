import * as admin from 'firebase-admin'
import { defineSecret, defineString } from 'firebase-functions/params'
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https'

const asaasApiKey = defineSecret('ASAAS_API_KEY')
const asaasWebhookToken = defineSecret('ASAAS_WEBHOOK_TOKEN')
const asaasApiBase = defineString('ASAAS_API_BASE', {
  default: 'https://api-sandbox.asaas.com/v3',
})

const PRICES_BRL: Record<string, number> = {
  premium_monthly: 29.9,
  boost_1h: 2.9,
  boost_3h: 5.9,
}

function asaasHeaders() {
  return {
    access_token: asaasApiKey.value(),
    'Content-Type': 'application/json',
    'User-Agent': 'SemAleatorio/1.0 (Firebase)',
  } as Record<string, string>
}

function dueDateStr(daysAhead: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

function parseExternalRef(ref: string): { uid: string; product: string } | null {
  if (!ref || !ref.startsWith('SA|')) return null
  const parts = ref.split('|')
  if (parts.length < 3) return null
  return { uid: parts[1], product: parts[2] }
}

async function ensureAsaasCustomer(
  uid: string,
  email: string,
  name: string,
): Promise<string> {
  const db = admin.firestore()
  const userRef = db.doc(`users/${uid}`)
  const snap = await userRef.get()
  const existing = snap.data()?.asaasCustomerId as string | undefined
  if (existing) return existing

  const base = asaasApiBase.value().replace(/\/$/, '')
  const res = await fetch(`${base}/customers`, {
    method: 'POST',
    headers: asaasHeaders(),
    body: JSON.stringify({
      name: name || 'Invocador',
      email: email || `user-${uid}@semaleatorio.local`,
      externalReference: `SA_USER|${uid}`,
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Asaas customer: ${res.status} ${t}`)
  }
  const data = (await res.json()) as { id: string }
  await userRef.update({ asaasCustomerId: data.id })
  return data.id
}

export const createAsaasCheckout = onCall(
  {
    region: 'us-central1',
    invoker: 'public',
    cors: true,
    secrets: [asaasApiKey],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login necessário.')
    }
    const uid = request.auth.uid
    const product = String(request.data?.product ?? '')
    if (!PRICES_BRL[product]) {
      throw new HttpsError('invalid-argument', 'Produto inválido.')
    }
    const key = asaasApiKey.value()?.trim()
    if (!key) {
      throw new HttpsError(
        'failed-precondition',
        'Configure o secret ASAAS_API_KEY.',
      )
    }

    const email = request.auth.token.email ?? ''
    const name =
      String(request.auth.token.name ?? request.auth.token.email ?? 'Invocador')

    const customerId = await ensureAsaasCustomer(uid, email, name)
    const value = PRICES_BRL[product]
    const base = asaasApiBase.value().replace(/\/$/, '')
    const externalReference = `SA|${uid}|${product}`

    const payRes = await fetch(`${base}/payments`, {
      method: 'POST',
      headers: asaasHeaders(),
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value,
        dueDate: dueDateStr(3),
        description:
          product === 'premium_monthly'
            ? 'SemAleatório Premium (30 dias)'
            : product === 'boost_1h'
              ? 'SemAleatório Boost 1h'
              : 'SemAleatório Boost 3h',
        externalReference,
      }),
    })

    if (!payRes.ok) {
      const t = await payRes.text()
      throw new HttpsError('internal', `Asaas cobrança: ${payRes.status} ${t}`)
    }
    const pay = (await payRes.json()) as {
      id: string
      invoiceUrl?: string
      bankSlipUrl?: string
    }
    return {
      paymentId: pay.id,
      invoiceUrl: pay.invoiceUrl ?? pay.bankSlipUrl ?? null,
    }
  },
)

export const asaasWebhook = onRequest(
  { secrets: [asaasWebhookToken], cors: false },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed')
      return
    }
    const token = String(req.headers['asaas-access-token'] ?? '')
    if (token !== asaasWebhookToken.value()) {
      res.status(401).send('Unauthorized')
      return
    }

    const body = req.body as {
      id?: string
      event?: string
      payment?: {
        id?: string
        externalReference?: string
        status?: string
      }
    }

    const db = admin.firestore()

    try {
      const event = body.event ?? ''
      const payment = body.payment
      const payId = payment?.id ?? body.id ?? 'unknown'

      if (event !== 'PAYMENT_RECEIVED') {
        res.status(200).json({ ok: true, ignored: event })
        return
      }

      const idemId = `asaas_${payId}`
      const idemRef = db.doc(`webhook_events/${idemId}`)
      const idemSnap = await idemRef.get()
      if (idemSnap.exists) {
        res.status(200).json({ ok: true, duplicate: true })
        return
      }

      const ext = parseExternalRef(String(payment?.externalReference ?? ''))
      if (!ext || !ext.uid) {
        await idemRef.set({
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
          event,
          note: 'no_external_ref',
        })
        res.status(200).json({ ok: true, skip: true })
        return
      }

      const userRef = db.doc(`users/${ext.uid}`)
      const userSnap = await userRef.get()
      if (!userSnap.exists) {
        await idemRef.set({
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
          event,
          note: 'user_missing',
        })
        res.status(200).json({ ok: true, skip: true })
        return
      }

      const updates: Record<string, unknown> = {}

      if (ext.product === 'premium_monthly') {
        const days = 30
        updates.plan = 'premium'
        updates.premiumUntil = admin.firestore.Timestamp.fromMillis(
          Date.now() + days * 86400000,
        )
      } else if (ext.product === 'boost_1h' || ext.product === 'boost_3h') {
        const hours = ext.product === 'boost_1h' ? 1 : 3
        const cur = userSnap.data()?.boostUntil as admin.firestore.Timestamp | undefined
        const now = Date.now()
        const base =
          cur && typeof cur.toMillis === 'function'
            ? Math.max(now, cur.toMillis())
            : now
        updates.boostUntil = admin.firestore.Timestamp.fromMillis(
          base + hours * 3600000,
        )
      }

      if (Object.keys(updates).length > 0) {
        await userRef.update(updates)
      }

      await idemRef.set({
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        event,
        paymentId: payId,
        uid: ext.uid,
        product: ext.product,
      })

      res.status(200).json({ ok: true })
    } catch (e) {
      console.error('asaasWebhook', e)
      res.status(500).json({ error: 'processing_failed' })
    }
  },
)
