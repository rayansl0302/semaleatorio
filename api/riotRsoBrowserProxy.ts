/**
 * Proxy CORS para RSO no browser — sem Firebase.
 * Expõe a Riot a qualquer um que chame a rota; uso temporário.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleCors } from '../vercel-api/lib/cors.js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (handleCors(req, res)) return
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed' } })
    return
  }

  try {
    const b = (req.body ?? {}) as {
      kind?: string
      formBody?: string
      authorization?: string
    }

    if (b.kind === 'token') {
      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
      if (typeof b.authorization === 'string' && b.authorization.trim()) {
        headers.Authorization = b.authorization.trim()
      }
      const r = await fetch('https://auth.riotgames.com/token', {
        method: 'POST',
        headers,
        body: String(b.formBody ?? ''),
      })
      const text = await r.text()
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text)
      return
    }

    if (b.kind === 'account_me') {
      const r = await fetch(
        'https://americas.api.riotgames.com/riot/account/v1/accounts/me',
        {
          headers: {
            Authorization: String(b.authorization ?? ''),
          },
        },
      )
      const text = await r.text()
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text)
      return
    }

    res.status(400).json({ error: { message: 'kind inválido' } })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: { message: 'Erro no proxy RSO.' } })
  }
}
