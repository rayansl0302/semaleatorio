import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleCors } from './cors'
import { ApiError } from './errors'

type Body = { data?: Record<string, unknown> }

export function parseData(req: VercelRequest): Record<string, unknown> {
  const b = (req.body ?? {}) as Body
  return (b.data ?? {}) as Record<string, unknown>
}

export function postHandler(
  run: (
    req: VercelRequest,
    data: Record<string, unknown>,
  ) => Promise<unknown>,
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    if (handleCors(req, res)) return
    if (req.method !== 'POST') {
      res.status(405).json({ error: { message: 'Method not allowed' } })
      return
    }
    try {
      const data = parseData(req)
      const result = await run(req, data)
      res.status(200).json({ result })
    } catch (e) {
      if (e instanceof ApiError) {
        res
          .status(e.status)
          .json({ error: { code: e.code, message: e.message } })
        return
      }
      console.error(e)
      res.status(500).json({ error: { message: 'Erro interno.' } })
    }
  }
}
