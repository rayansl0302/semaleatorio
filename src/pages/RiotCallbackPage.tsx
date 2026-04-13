import { getAuth } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { vercelApiCall, vercelApiConfigured } from '../firebase/api'
import { formatApiBackendError } from '../lib/callableErrors'

export const RIOT_OAUTH_MESSAGE = 'semaleatorio-riot-oauth' as const

type RiotOAuthMsg =
  | { type: typeof RIOT_OAUTH_MESSAGE; ok: true }
  | { type: typeof RIOT_OAUTH_MESSAGE; ok: false; error?: string }

function postToOpener(payload: RiotOAuthMsg) {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin)
    }
  } catch {
    /* ignore */
  }
}

const inflight = new Map<string, Promise<{ ok: true } | { ok: false; error: string }>>()

function completeOnce(code: string, state: string) {
  const key = `${state}:${code.slice(0, 16)}`
  let p = inflight.get(key)
  if (!p) {
    p = (async () => {
      try {
        if (!vercelApiConfigured()) {
          return {
            ok: false as const,
            error: 'Defina VITE_VERCEL_API_URL no .env (URL do deploy Vercel).',
          }
        }
        await vercelApiCall('completeRiotOAuth', { code, state })
        return { ok: true as const }
      } catch (e) {
        const msg = formatApiBackendError(e)
        return { ok: false as const, error: msg }
      } finally {
        inflight.delete(key)
      }
    })()
    inflight.set(key, p)
  }
  return p
}

export function RiotCallbackPage() {
  const [params] = useSearchParams()
  const queryKey = params.toString()
  const [status, setStatus] = useState('Processando retorno da Riot…')

  useEffect(() => {
    const err = params.get('error')
    const errDesc = params.get('error_description')
    function redirectToPerfil(kind: 'ok' | 'err', detail?: string) {
      const q = new URLSearchParams()
      q.set('riot', kind)
      if (detail) q.set('detail', detail)
      window.location.replace(`/app/perfil?${q.toString()}`)
    }

    if (err) {
      const text =
        (errDesc && decodeURIComponent(errDesc.replace(/\+/g, ' '))) || err
      setStatus(text)
      postToOpener({ type: RIOT_OAUTH_MESSAGE, ok: false, error: text })
      if (window.opener && !window.opener.closed) {
        window.setTimeout(() => {
          try {
            window.close()
          } catch {
            /* ignore */
          }
        }, 2800)
      } else {
        redirectToPerfil('err', text)
      }
      return
    }

    const code = params.get('code')
    const state = params.get('state')
    if (!code || !state) {
      const text = 'Retorno inválido (sem code ou state).'
      setStatus(text)
      postToOpener({ type: RIOT_OAUTH_MESSAGE, ok: false, error: text })
      if (!window.opener || window.opener.closed) {
        redirectToPerfil('err', text)
      }
      return
    }

    const auth = getAuth()
    if (!auth.currentUser) {
      const text = 'Sessão expirou. Entre de novo e reconecte a Riot.'
      setStatus(text)
      postToOpener({ type: RIOT_OAUTH_MESSAGE, ok: false, error: text })
      if (!window.opener || window.opener.closed) {
        window.location.replace(
          `/entrar?redirect=${encodeURIComponent('/app/perfil')}`,
        )
      }
      return
    }

    let alive = true
    void completeOnce(code, state).then((r) => {
      if (!alive) return
      if (r.ok) {
        setStatus('Conta Riot conectada.')
        postToOpener({ type: RIOT_OAUTH_MESSAGE, ok: true })
        if (window.opener && !window.opener.closed) {
          window.setTimeout(() => {
            try {
              window.close()
            } catch {
              /* ignore */
            }
          }, 500)
        } else {
          window.location.replace('/app/perfil?riot=ok')
        }
      } else {
        setStatus(r.error)
        postToOpener({ type: RIOT_OAUTH_MESSAGE, ok: false, error: r.error })
        if (window.opener && !window.opener.closed) {
          window.setTimeout(() => {
            try {
              window.close()
            } catch {
              /* ignore */
            }
          }, 3200)
        } else {
          redirectToPerfil('err', r.error)
        }
      }
    })

    return () => {
      alive = false
    }
  }, [queryKey])

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold text-white">Riot Games</h1>
      <p className="text-sm text-slate-400">{status}</p>
    </div>
  )
}
