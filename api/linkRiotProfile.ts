import { requireUid } from '../vercel-api/lib/auth.js'
import { getAdmin, getDb } from '../vercel-api/lib/admin.js'
import { ApiError } from '../vercel-api/lib/errors.js'
import { postHandler } from '../vercel-api/lib/handler.js'
import { profileSlugFromNick } from '../vercel-api/lib/profileSlug.js'
import { FetchRankError, fetchRankByRiotId } from '../vercel-api/lib/riotRank.js'

export default postHandler(async (req, data) => {
  getAdmin()
  const uid = await requireUid(req)
  const gameName = String(data.gameName ?? '').trim()
  const tagLine = String(data.tagLine ?? '')
    .trim()
    .replace(/^#/, '')
  if (!gameName || !tagLine) {
    throw new ApiError(400, 'invalid-argument', 'Nick e tag obrigatórios.')
  }
  const key = (process.env.RIOT_API_KEY ?? '').trim()
  if (!key) {
    throw new ApiError(
      412,
      'failed-precondition',
      'Defina RIOT_API_KEY nas variáveis de ambiente.',
    )
  }
  const platform =
    (process.env.RIOT_PLATFORM_ROUTING ?? 'br1').trim().toLowerCase() || 'br1'

  let rank: { elo: string; puuid: string }
  try {
    rank = await fetchRankByRiotId(key, gameName, tagLine, platform)
  } catch (e) {
    if (e instanceof FetchRankError) {
      const status =
        e.kind === 'not-found'
          ? 404
          : e.kind === 'failed-precondition'
            ? 412
            : e.kind === 'resource-exhausted'
              ? 429
              : 500
      throw new ApiError(status, e.kind, e.message)
    }
    throw e
  }

  const db = getDb()
  const slug = profileSlugFromNick(gameName, tagLine)
  await db.doc(`users/${uid}`).set(
    {
      nickname: gameName,
      tag: tagLine,
      riotPuuid: rank.puuid,
      elo: rank.elo,
      profileSlug: slug,
    },
    { merge: true },
  )

  return {
    gameName,
    tagLine,
    puuid: rank.puuid,
    elo: rank.elo,
    profileSlug: slug,
  }
})
