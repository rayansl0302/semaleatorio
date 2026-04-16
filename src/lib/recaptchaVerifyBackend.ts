import { getBackendBaseUrl } from './asaasPublic'

/** Valida o token reCAPTCHA v2 no backend (chave secreta só no servidor). */
export async function verifyRecaptchaWithBackend(token: string): Promise<void> {
  const base = getBackendBaseUrl().trim()
  if (!base) {
    throw new Error('Defina VITE_BACKEND_URL para validar o reCAPTCHA.')
  }

  const res = await fetch(`${base}/api/auth/recaptcha-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })

  const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string }

  if (!res.ok) {
    const msg =
      (typeof body.message === 'string' && body.message) ||
      (typeof body.error === 'string' && body.error) ||
      `Erro ${res.status} ao validar reCAPTCHA.`
    throw new Error(msg)
  }
}
