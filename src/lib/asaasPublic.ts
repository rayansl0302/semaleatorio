export function getBackendBaseUrl(): string {
  return import.meta.env.VITE_BACKEND_URL?.trim().replace(/\/$/, '') ?? ''
}

export function isBackendConfigured(): boolean {
  return getBackendBaseUrl().length > 0
}

/**
 * Chama POST /api/checkout no backend (Railway).
 * O backend cria cliente + cobrança no Asaas e devolve a invoiceUrl.
 */
export async function createCheckout(params: {
  firebaseIdToken: string
  productRef: string
  cpf: string
}): Promise<string> {
  const res = await fetch(`${getBackendBaseUrl()}/api/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.firebaseIdToken}`,
    },
    body: JSON.stringify({ productRef: params.productRef, cpf: params.cpf }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg =
      (body as { message?: string }).message ??
      `Erro ${res.status} ao criar cobrança.`
    throw new Error(msg)
  }

  const data = (await res.json()) as { invoiceUrl?: string }
  if (!data.invoiceUrl) throw new Error('invoiceUrl não retornada pelo servidor.')
  return data.invoiceUrl
}

/**
 * Painel admin: percorre os N registos mais recentes em `webhook_events` e actualiza cada um
 * com valor bruto, líquido e método vindos da API Asaas (quando aplicável).
 */
export async function adminSyncWebhookPaymentsFromAsaas(params: {
  firebaseIdToken: string
  /** Predefinição no servidor: 200; máximo 500. */
  limit?: number
}): Promise<{
  ok: true
  examined: number
  updated: number
  noChange: number
  skippedRef: number
  asaasError: number
}> {
  const res = await fetch(`${getBackendBaseUrl()}/api/admin/sync-webhook-payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.firebaseIdToken}`,
    },
    body: JSON.stringify(
      params.limit != null && Number.isFinite(params.limit)
        ? { limit: Math.floor(params.limit) }
        : {},
    ),
  })

  const body = (await res.json().catch(() => ({}))) as {
    ok?: unknown
    examined?: unknown
    updated?: unknown
    noChange?: unknown
    skippedRef?: unknown
    asaasError?: unknown
    error?: unknown
    message?: unknown
  }

  if (!res.ok) {
    const msg =
      (typeof body.message === 'string' && body.message) ||
      (typeof body.error === 'string' && body.error) ||
      `Erro ${res.status}`
    throw new Error(msg)
  }

  return {
    ok: true,
    examined: typeof body.examined === 'number' ? body.examined : 0,
    updated: typeof body.updated === 'number' ? body.updated : 0,
    noChange: typeof body.noChange === 'number' ? body.noChange : 0,
    skippedRef: typeof body.skippedRef === 'number' ? body.skippedRef : 0,
    asaasError: typeof body.asaasError === 'number' ? body.asaasError : 0,
  }
}
