import { requireUid } from './lib/auth'
import { getAdmin } from './lib/admin'
import { postHandler } from './lib/handler'
import { riotCompleteOAuth } from './lib/riotOAuth'

export default postHandler(async (req, data) => {
  getAdmin()
  const uid = await requireUid(req)
  const code = String(data.code ?? '')
  const state = String(data.state ?? '')
  return riotCompleteOAuth(uid, code, state)
})
