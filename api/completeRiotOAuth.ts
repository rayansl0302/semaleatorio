import { requireUid } from './lib/auth.js'
import { getAdmin } from './lib/admin.js'
import { postHandler } from './lib/handler.js'
import { riotCompleteOAuth } from './lib/riotOAuth.js'

export default postHandler(async (req, data) => {
  getAdmin()
  const uid = await requireUid(req)
  const code = String(data.code ?? '')
  const state = String(data.state ?? '')
  return riotCompleteOAuth(uid, code, state)
})
