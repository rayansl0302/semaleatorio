import { requireUid } from './lib/auth.js'
import { getAdmin } from './lib/admin.js'
import { ApiError } from './lib/errors.js'
import { postHandler } from './lib/handler.js'
import { FetchRankError, fetchRankByRiotId } from './lib/riotRank.js'

export default postHandler(async (req, data) => {
  getAdmin()
  await requireUid(req)
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
      'Defina RIOT_API_KEY nas variáveis de ambiente da Vercel.',
    )
  }
  const platform =
    (process.env.RIOT_PLATFORM_ROUTING ?? 'br1').trim().toLowerCase() || 'br1'
  try {
    return await fetchRankByRiotId(key, gameName, tagLine, platform)
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
})
