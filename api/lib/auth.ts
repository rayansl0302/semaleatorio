import type { VercelRequest } from '@vercel/node'
import { ApiError } from './errors'
import { getAdmin } from './admin'

export async function requireUid(req: VercelRequest): Promise<string> {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) {
    throw new ApiError(401, 'unauthenticated', 'Faça login.')
  }
  const token = h.slice(7)
  try {
    const decoded = await getAdmin().auth().verifyIdToken(token)
    return decoded.uid
  } catch {
    throw new ApiError(401, 'unauthenticated', 'Sessão inválida ou expirada.')
  }
}
