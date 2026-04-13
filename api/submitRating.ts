import admin from 'firebase-admin'
import { requireUid } from '../vercel-api/lib/auth.js'
import { getRtdb } from '../vercel-api/lib/admin.js'
import { ApiError } from '../vercel-api/lib/errors.js'
import { postHandler } from '../vercel-api/lib/handler.js'

export default postHandler(async (req, data) => {
  const rtdb = getRtdb()
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

  const userRef = rtdb.ref(`users/${toUid}`)
  const userSnap = await userRef.once('value')
  if (!userSnap.exists()) {
    throw new ApiError(404, 'not-found', 'Usuário não encontrado.')
  }
  const cur = userSnap.val() as { ratingAvg?: number; ratingCount?: number }
  const prevN = cur.ratingCount ?? 0
  const prevAvg = cur.ratingAvg ?? 0
  const count = prevN + 1
  const newAvg = prevN === 0 ? overall : (prevAvg * prevN + overall) / count
  const semiAleatorio = count >= 5 && newAvg >= 4.2

  const ratingKey = rtdb.ref('ratings').push().key
  if (!ratingKey) {
    throw new ApiError(500, 'internal', 'Falha ao criar id da avaliação.')
  }

  const patch: Record<string, unknown> = {
    [`users/${toUid}/ratingAvg`]: newAvg,
    [`users/${toUid}/ratingCount`]: count,
    [`users/${toUid}/semiAleatorio`]: semiAleatorio,
    [`ratings/${ratingKey}/fromUid`]: fromUid,
    [`ratings/${ratingKey}/toUid`]: toUid,
    [`ratings/${ratingKey}/communication`]: communication,
    [`ratings/${ratingKey}/skill`]: skill,
    [`ratings/${ratingKey}/toxicity`]: toxicity,
    [`ratings/${ratingKey}/overall`]: overall,
    [`ratings/${ratingKey}/createdAt`]: admin.database.ServerValue.TIMESTAMP,
  }
  await rtdb.ref().update(patch)

  return { ok: true }
})
