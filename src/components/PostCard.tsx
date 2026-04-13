import { get } from 'firebase/database'
import { useEffect, useState } from 'react'
import { rtdb } from '../firebase/config'
import { normalizeUserFromRtdb, userProfileRef } from '../lib/rtdbUserProfile'
import { LolEloIcon, LolRoleIcon } from './LolIcons'
import { QUEUE_LABELS } from '../lib/constants'
import type { PostDoc, UserProfile } from '../types/models'

type Props = {
  post: PostDoc
  onAuthorClick?: (uid: string) => void
}

export function PostCard({ post, onAuthorClick }: Props) {
  const [author, setAuthor] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (!rtdb || !post.uid) return
    let cancelled = false
    get(userProfileRef(rtdb, post.uid)).then((snap) => {
      if (cancelled || !snap.exists()) return
      const p = normalizeUserFromRtdb(snap.val(), post.uid)
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

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-white">{post.title}</h3>
        <span className="shrink-0 text-xs text-slate-500">{date}</span>
      </div>
      <p className="mt-2 text-sm text-slate-400">{post.description}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-slate-300">
          <LolEloIcon elo={post.eloMin ?? 'UNRANKED'} className="h-5 w-5" />
          Elo mín: {post.eloMin ?? 'UNRANKED'}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-slate-300">
          <LolRoleIcon role={post.role} className="h-4 w-4" />
          Rota: {post.role}
        </span>
        <span className="rounded-md bg-accent/20 px-2 py-1 font-medium text-amber-200">
          {QUEUE_LABELS[post.queueType] ?? post.queueType}
        </span>
      </div>
      {author && (
        <button
          type="button"
          onClick={() => onAuthorClick?.(post.uid)}
          className="mt-3 text-left text-sm text-secondary hover:underline"
        >
          {author.nickname}#{author.tag}
        </button>
      )}
    </article>
  )
}
