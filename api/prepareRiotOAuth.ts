import { requireUid } from './lib/auth'
import { getAdmin } from './lib/admin'
import { postHandler } from './lib/handler'
import { riotPrepareOAuth } from './lib/riotOAuth'

export default postHandler(async (req, _data) => {
  getAdmin()
  const uid = await requireUid(req)
  return riotPrepareOAuth(uid)
})
