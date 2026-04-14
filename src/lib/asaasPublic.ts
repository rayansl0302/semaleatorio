const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.trim().replace(/\/$/, '') ?? ''

export function isBackendConfigured(): boolean {
  return BACKEND_URL.length > 0
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
  const res = await fetch(`${BACKEND_URL}/api/checkout`, {
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
