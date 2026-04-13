import type { VercelRequest } from '@vercel/node'
import { ApiError } from './errors.js'
import { getAdmin } from './admin.js'

async function verifyBearer(req: VercelRequest) {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) {
    throw new ApiError(401, 'unauthenticated', 'Faça login.')
  }
  const token = h.slice(7)
  try {
    return await getAdmin().auth().verifyIdToken(token)
  } catch {
    throw new ApiError(401, 'unauthenticated', 'Sessão inválida ou expirada.')
  }
}

export async function requireUid(req: VercelRequest): Promise<string> {
  const decoded = await verifyBearer(req)
  return decoded.uid
}

export async function requireAuthUser(req: VercelRequest): Promise<{
  uid: string
  email: string
  name: string
}> {
  const decoded = await verifyBearer(req)
  return {
    uid: decoded.uid,
    email: decoded.email ?? '',
    name: String(decoded.name ?? decoded.email ?? 'Invocador'),
  }
}
