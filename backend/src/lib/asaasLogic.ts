import type admin from 'firebase-admin'
import { getAdmin, getDb } from './admin.js'
import { ApiError } from './errors.js'

const PRICES_BRL: Record<string, number> = {
  premium_monthly: 29.9,
  boost_1h: 2.9,
  boost_3h: 5.9,
}

function asaasHeaders(apiKey: string) {
  return {
    access_token: apiKey,
    'Content-Type': 'application/json',
    'User-Agent': 'SemAleatorio/1.0 (Railway)',
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
  apiKey: string,
  baseUrl: string,
): Promise<string> {
  const db = getDb()
  const userRef = db.doc(`users/${uid}`)
  const snap = await userRef.get()
  const existing = snap.data()?.asaasCustomerId as string | undefined
  if (existing) return existing

  const base = baseUrl.replace(/\/$/, '')
  const res = await fetch(`${base}/customers`, {
    method: 'POST',
    headers: asaasHeaders(apiKey),
    body: JSON.stringify({
      name: name || 'Invocador',
      email: email || `user-${uid}@semaleatorio.local`,
      externalReference: `SA_USER|${uid}`,
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new ApiError(500, 'internal', `Asaas customer: ${res.status} ${t}`)
  }
  const data = (await res.json()) as { id: string }
  await userRef.update({ asaasCustomerId: data.id })
  return data.id
}

export async function createAsaasCheckoutHandler(
  uid: string,
  email: string,
  name: string,
  product: string,
): Promise<{ paymentId?: string; invoiceUrl?: string | null }> {
  if (!PRICES_BRL[product]) {
    throw new ApiError(400, 'invalid-argument', 'Produto inválido.')
  }
  const apiKey = (process.env.ASAAS_API_KEY ?? '').trim()
  if (!apiKey) {
    throw new ApiError(
      412,
      'failed-precondition',
      'Configure ASAAS_API_KEY no Railway.',
    )
  }
  const baseUrl =
    (process.env.ASAAS_API_BASE ?? 'https://api-sandbox.asaas.com/v3').replace(
      /\/$/,
      '',
    )

  const customerId = await ensureAsaasCustomer(uid, email, name, apiKey, baseUrl)
  const value = PRICES_BRL[product]
  const externalReference = `SA|${uid}|${product}`

  const payRes = await fetch(`${baseUrl}/payments`, {
    method: 'POST',
    headers: asaasHeaders(apiKey),
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
    throw new ApiError(500, 'internal', `Asaas cobrança: ${payRes.status} ${t}`)
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
}

export async function processAsaasWebhook(
  tokenHeader: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; duplicate?: boolean; skip?: boolean; ignored?: string }> {
  const expected = (process.env.ASAAS_WEBHOOK_TOKEN ?? '').trim()
  if (!expected || tokenHeader !== expected) {
    throw new ApiError(401, 'unauthenticated', 'Unauthorized')
  }

  const db = getDb()
  const adm = getAdmin()

  const event = String(body.event ?? '')
  const payment = body.payment as
    | { id?: string; externalReference?: string; status?: string }
    | undefined
  const payId = payment?.id ?? (body.id as string | undefined) ?? 'unknown'

  if (event !== 'PAYMENT_RECEIVED') {
    return { ok: true, ignored: event }
  }

  const idemId = `asaas_${payId}`
  const idemRef = db.doc(`webhook_events/${idemId}`)
  const idemSnap = await idemRef.get()
  if (idemSnap.exists) {
    return { ok: true, duplicate: true }
  }

  const ext = parseExternalRef(String(payment?.externalReference ?? ''))
  if (!ext || !ext.uid) {
    await idemRef.set({
      receivedAt: adm.firestore.FieldValue.serverTimestamp(),
      event,
      note: 'no_external_ref',
    })
    return { ok: true, skip: true }
  }

  const userRef = db.doc(`users/${ext.uid}`)
  const userSnap = await userRef.get()
  if (!userSnap.exists) {
    await idemRef.set({
      receivedAt: adm.firestore.FieldValue.serverTimestamp(),
      event,
      note: 'user_missing',
    })
    return { ok: true, skip: true }
  }

  const updates: Record<string, unknown> = {}

  if (ext.product === 'premium_monthly') {
    const days = 30
    updates.plan = 'premium'
    updates.premiumUntil = adm.firestore.Timestamp.fromMillis(
      Date.now() + days * 86400000,
    )
  } else if (ext.product === 'boost_1h' || ext.product === 'boost_3h') {
    const hours = ext.product === 'boost_1h' ? 1 : 3
    const cur = userSnap.data()?.boostUntil as
      | admin.firestore.Timestamp
      | undefined
    const now = Date.now()
    const base =
      cur && typeof cur.toMillis === 'function'
        ? Math.max(now, cur.toMillis())
        : now
    updates.boostUntil = adm.firestore.Timestamp.fromMillis(
      base + hours * 3600000,
    )
  }

  if (Object.keys(updates).length > 0) {
    await userRef.update(updates)
  }

  await idemRef.set({
    receivedAt: adm.firestore.FieldValue.serverTimestamp(),
    event,
    paymentId: payId,
    uid: ext.uid,
    product: ext.product,
  })

  return { ok: true }
}
