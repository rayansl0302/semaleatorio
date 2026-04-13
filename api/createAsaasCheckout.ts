import { requireAuthUser } from './lib/auth.js'
import { getAdmin } from './lib/admin.js'
import { postHandler } from './lib/handler.js'
import { createAsaasCheckoutHandler } from './lib/asaasLogic.js'

export default postHandler(async (req, data) => {
  getAdmin()
  const { uid, email, name } = await requireAuthUser(req)
  const product = String(data.product ?? '')
  return createAsaasCheckoutHandler(uid, email, name, product)
})
