import { isPremiumActive, premiumVariantOf } from './plan'
import type { PostDoc, UserProfile } from '../types/models'

/** Conta gratuita: visibilidade no feed após publicação. */
export const FEED_POST_TTL_MS_FREE = 2 * 60 * 60 * 1000

/** Premium Essencial: tempo extra no feed. */
export const FEED_POST_TTL_MS_PREMIUM_ESSENTIAL = 12 * 60 * 60 * 1000

/** Premium Completo: maior permanência no feed. */
export const FEED_POST_TTL_MS_PREMIUM_COMPLETE = 48 * 60 * 60 * 1000

type AuthorForTtl = Pick<UserProfile, 'plan' | 'premiumUntil' | 'premiumVariant'> | null | undefined

export function feedPostTtlMsForAuthor(author: AuthorForTtl): number {
  if (!author || !isPremiumActive(author)) {
    return FEED_POST_TTL_MS_FREE
  }
  return premiumVariantOf(author) === 'essential'
    ? FEED_POST_TTL_MS_PREMIUM_ESSENTIAL
    : FEED_POST_TTL_MS_PREMIUM_COMPLETE
}

export function feedPostTtlLabelForAuthor(author: AuthorForTtl): string {
  const ms = feedPostTtlMsForAuthor(author)
  const hours = Math.round(ms / (60 * 60 * 1000))
  return hours === 1 ? '1 hora' : `${hours} horas`
}

export function isFeedPostStillVisible(
  post: Pick<PostDoc, 'createdAt'>,
  author: AuthorForTtl,
  nowMs: number,
): boolean {
  if (!post.createdAt || typeof post.createdAt.toMillis !== 'function') {
    return false
  }
  const created = post.createdAt.toMillis()
  const ttl = feedPostTtlMsForAuthor(author)
  return nowMs - created < ttl
}
