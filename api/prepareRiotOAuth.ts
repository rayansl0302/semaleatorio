import { requireUid } from './lib/auth.js'
import { getAdmin } from './lib/admin.js'
import { postHandler } from './lib/handler.js'
import { riotPrepareOAuth } from './lib/riotOAuth.js'

export default postHandler(async (req, _data) => {
  getAdmin()
  const uid = await requireUid(req)
  return riotPrepareOAuth(uid)
})
