import { requireAuthUser } from '../vercel-api/lib/auth.js'
import { getAdmin } from '../vercel-api/lib/admin.js'
import { postHandler } from '../vercel-api/lib/handler.js'
import { createAsaasCheckoutHandler } from '../vercel-api/lib/asaasLogic.js'

export default postHandler(async (req, data) => {
  getAdmin()
  const { uid, email, name } = await requireAuthUser(req)
  const product = String(data.product ?? '')
  return createAsaasCheckoutHandler(uid, email, name, product)
})
