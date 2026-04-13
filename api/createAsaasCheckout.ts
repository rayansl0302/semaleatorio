import { requireAuthUser } from './lib/auth'
import { getAdmin } from './lib/admin'
import { postHandler } from './lib/handler'
import { createAsaasCheckoutHandler } from './lib/asaasLogic'

export default postHandler(async (req, data) => {
  getAdmin()
  const { uid, email, name } = await requireAuthUser(req)
  const product = String(data.product ?? '')
  return createAsaasCheckoutHandler(uid, email, name, product)
})
