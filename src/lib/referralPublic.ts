import { getBackendBaseUrl } from './asaasPublic'

export type ClaimReferralResult = {
  attached: boolean
  reason?: string
}

export async function claimReferralSlug(params: {
  firebaseIdToken: string
  slug: string
}): Promise<ClaimReferralResult> {
  const base = getBackendBaseUrl()
  if (!base) throw new Error('Backend não configurado.')

  const res = await fetch(`${base}/api/referral/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.firebaseIdToken}`,
    },
    body: JSON.stringify({ slug: params.slug.trim().toLowerCase() }),
  })

  const body = (await res.json().catch(() => ({}))) as {
    attached?: unknown
    reason?: unknown
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
    attached: Boolean(body.attached),
    reason: typeof body.reason === 'string' ? body.reason : undefined,
  }
}
