import admin from 'firebase-admin'
import { getRtdb } from './admin.js'
import { profileSlugFromNick } from './profileSlug.js'

export async function persistLinkedRiotProfile(
  uid: string,
  gameName: string,
  tagLine: string,
  puuid: string,
  elo: string,
) {
  const rtdb = getRtdb()
  const slug = profileSlugFromNick(gameName, tagLine)
  const updates: Record<string, unknown> = {
    [`users/${uid}/nickname`]: gameName,
    [`users/${uid}/tag`]: tagLine,
    [`users/${uid}/riotPuuid`]: puuid,
    [`users/${uid}/elo`]: elo,
    [`users/${uid}/profileSlug`]: slug,
    [`users/${uid}/lastOnline`]: admin.database.ServerValue.TIMESTAMP,
    [`profileSlugIndex/${slug}/uid`]: uid,
  }
  await rtdb.ref().update(updates)
  return {
    gameName,
    tagLine,
    puuid,
    elo,
    profileSlug: slug,
  }
}
