import { getDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase/config'
import { normalizeUserFromFirestore, userProfileDoc } from '../lib/firestoreUserProfile'
import { Send } from '../lib/icons'
import { isPremiumActive, premiumVariantOf } from '../lib/plan'
import { openMessagesDockWithPeer } from '../lib/messageDock'
import { LolEloIcon, LolRoleIcon } from './LolIcons'
import {
  QUEUE_LABELS,
  formatEloDisplay,
  roleLabel,
} from '../lib/constants'
import type { PostDoc, UserProfile } from '../types/models'

type Props = {
  post: PostDoc
  onAuthorClick?: (uid: string) => void
  viewerUid?: string | null
}

export function PostCard({ post, onAuthorClick, viewerUid }: Props) {
  const [author, setAuthor] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (!db || !post.uid) return
    let cancelled = false
    getDoc(userProfileDoc(db, post.uid)).then((snap) => {
      if (cancelled || !snap.exists()) return
      const p = normalizeUserFromFirestore(snap.data(), post.uid)
      if (p) setAuthor(p)
    })
    return () => {
      cancelled = true
    }
  }, [post.uid])

  const date =
    post.createdAt && typeof post.createdAt.toDate === 'function'
      ? post.createdAt.toDate().toLocaleString('pt-BR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : ''

  const authorIsPro = author && isPremiumActive(author) && premiumVariantOf(author) === 'complete'
  const authorIsEssential = author && isPremiumActive(author) && premiumVariantOf(author) === 'essential'
  const authorBoosted = (() => {
    if (!author) return false
    const bEnd =
      author.boostUntil && typeof author.boostUntil.toMillis === 'function'
        ? author.boostUntil.toMillis()
        : 0
    return bEnd > Date.now()
  })()

  const postCardClass = authorIsPro
    ? 'border-amber-400/50 bg-gradient-to-r from-amber-900/15 via-card to-card shadow-[0_0_16px_-5px_rgba(251,191,36,0.2)]'
    : authorIsEssential
      ? 'border-cyan-400/35 bg-gradient-to-r from-cyan-900/10 via-card to-card shadow-[0_0_12px_-5px_rgba(34,211,238,0.15)]'
      : authorBoosted
        ? 'border-emerald-400/40 bg-gradient-to-r from-emerald-900/10 via-card to-card shadow-[0_0_12px_-5px_rgba(52,211,153,0.15)]'
        : 'border-border bg-card'

  return (
    <article className={`relative overflow-hidden rounded-xl border p-4 ${postCardClass}`}>
      {authorIsPro && (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(251,191,36,0.04)_45%,rgba(251,191,36,0.08)_50%,rgba(251,191,36,0.04)_55%,transparent_60%)] animate-[shimmer_3s_infinite]" />
      )}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-white">{post.title}</h3>
        <span className="shrink-0 text-xs text-slate-500">{date}</span>
      </div>
      <p className="mt-2 text-sm text-slate-400">{post.description}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-slate-300">
          <LolEloIcon elo={post.eloMin ?? 'UNRANKED'} className="h-5 w-5" />
          Elo mín.: {formatEloDisplay(post.eloMin)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-slate-300">
          <LolRoleIcon role={post.role} className="h-5 w-5" />
          {roleLabel(post.role)}
        </span>
        <span className="rounded-md bg-primary/15 px-2 py-1 text-primary">
          {QUEUE_LABELS[post.queueType] ?? post.queueType}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {author && (
          <>
            <button
              type="button"
              onClick={() => onAuthorClick?.(post.uid)}
              className="text-left text-xs text-slate-500 underline-offset-2 hover:text-primary hover:underline"
            >
              Por {author.nickname}#{author.tag}
            </button>
            {authorIsPro && (
              <span className="rounded bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950 shadow-sm shadow-amber-400/30">
                PRO
              </span>
            )}
            {authorIsEssential && (
              <span className="rounded bg-gradient-to-r from-cyan-300 via-cyan-200 to-cyan-400 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-950 shadow-sm shadow-cyan-400/20">
                Premium
              </span>
            )}
            {authorBoosted && (
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                ⚡ Destaque
              </span>
            )}
          </>
        )}
        {viewerUid && viewerUid !== post.uid && (
          <button
            type="button"
            onClick={() => openMessagesDockWithPeer(post.uid)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/40 bg-secondary/15 px-2.5 py-1.5 text-xs font-medium text-blue-100 transition hover:bg-secondary/25"
          >
            <Send className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Mensagem
          </button>
        )}
      </div>
    </article>
  )
}
