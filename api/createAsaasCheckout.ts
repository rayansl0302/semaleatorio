import { requireUid } from './lib/auth'
import { getAdmin } from './lib/admin'
import { postHandler } from './lib/handler'
import { createAsaasCheckoutHandler } from './lib/asaasLogic'

export default postHandler(async (req, data) => {
  const adm = getAdmin()
  const uid = await requireUid(req)
  const token = req.headers.authorization?.slice(7) ?? ''
  const decoded = await adm.auth().verifyIdToken(token)
  const email = decoded.email ?? ''
  const name = String(decoded.name ?? decoded.email ?? 'Invocador')
  const product = String(data.product ?? '')
  return createAsaasCheckoutHandler(uid, email, name, product)
})
