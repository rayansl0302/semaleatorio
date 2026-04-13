import { requireUid } from '../vercel-api/lib/auth.js'
import { getAdmin } from '../vercel-api/lib/admin.js'
import { postHandler } from '../vercel-api/lib/handler.js'
import { riotCompleteOAuth } from '../vercel-api/lib/riotOAuth.js'

export default postHandler(async (req, data) => {
  getAdmin()
  const uid = await requireUid(req)
  const code = String(data.code ?? '')
  const state = String(data.state ?? '')
  return riotCompleteOAuth(uid, code, state)
})
