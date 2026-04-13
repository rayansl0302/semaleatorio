import { requireUid } from '../vercel-api/lib/auth.js'
import { getAdmin } from '../vercel-api/lib/admin.js'
import { postHandler } from '../vercel-api/lib/handler.js'
import { riotPrepareOAuth } from '../vercel-api/lib/riotOAuth.js'

export default postHandler(async (req, _data) => {
  getAdmin()
  const uid = await requireUid(req)
  return riotPrepareOAuth(uid)
})
