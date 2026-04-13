import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleCors } from './lib/cors'
import { ApiError } from './lib/errors'
import { getAdmin } from './lib/admin'
import { processAsaasWebhook } from './lib/asaasLogic'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }
  try {
    getAdmin()
    const token = String(req.headers['asaas-access-token'] ?? '')
    const body = (req.body ?? {}) as Record<string, unknown>
    const out = await processAsaasWebhook(token, body)
    res.status(200).json(out)
  } catch (e) {
    if (e instanceof ApiError) {
      res.status(e.status).send(e.message)
      return
    }
    console.error('asaasWebhook', e)
    res.status(500).json({ error: 'processing_failed' })
  }
}
