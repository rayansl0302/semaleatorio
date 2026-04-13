import { getDb } from './admin.js'
import { profileSlugFromNick } from './profileSlug.js'

export async function persistLinkedRiotProfile(
  uid: string,
  gameName: string,
  tagLine: string,
  puuid: string,
  elo: string,
) {
  const db = getDb()
  const slug = profileSlugFromNick(gameName, tagLine)
  await db.doc(`users/${uid}`).set(
    {
      nickname: gameName,
      tag: tagLine,
      riotPuuid: puuid,
      elo,
      profileSlug: slug,
    },
    { merge: true },
  )
  return {
    gameName,
    tagLine,
    puuid,
    elo,
    profileSlug: slug,
  }
}
