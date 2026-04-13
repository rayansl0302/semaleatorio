import type { VercelRequest, VercelResponse } from '@vercel/node'

/** Responde OPTIONS e define cabeçalhos CORS (Bearer no header, sem cookies → * ok). */
export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, asaas-access-token',
  )
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}
