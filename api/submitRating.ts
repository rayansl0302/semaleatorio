import { requireUid } from './lib/auth'
import { getAdmin, getDb } from './lib/admin'
import { ApiError } from './lib/errors'
import { postHandler } from './lib/handler'

export default postHandler(async (req, data) => {
  const admin = getAdmin()
  const db = getDb()
  const fromUid = await requireUid(req)
  const toUid = String(data.toUid ?? '')
  const communication = Number(data.communication)
  const skill = Number(data.skill)
  const toxicity = Number(data.toxicity)
  if (!toUid || fromUid === toUid) {
    throw new ApiError(400, 'invalid-argument', 'Alvo inválido.')
  }
  if (
    ![communication, skill, toxicity].every(
      (n) => Number.isInteger(n) && n >= 1 && n <= 5,
    )
  ) {
    throw new ApiError(400, 'invalid-argument', 'Notas entre 1 e 5.')
  }
  const overall = (communication + skill + (6 - toxicity)) / 3

  const userRef = db.doc(`users/${toUid}`)
  const ratingRef = db.collection('ratings').doc()
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists) {
      throw new ApiError(404, 'not-found', 'Usuário não encontrado.')
    }
    const cur = snap.data() as { ratingAvg?: number; ratingCount?: number }
    const prevN = cur.ratingCount ?? 0
    const prevAvg = cur.ratingAvg ?? 0
    const count = prevN + 1
    const newAvg = prevN === 0 ? overall : (prevAvg * prevN + overall) / count
    const semiAleatorio = count >= 5 && newAvg >= 4.2
    tx.set(ratingRef, {
      fromUid,
      toUid,
      communication,
      skill,
      toxicity,
      overall,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    tx.update(userRef, {
      ratingAvg: newAvg,
      ratingCount: count,
      semiAleatorio,
    })
  })

  return { ok: true }
})
