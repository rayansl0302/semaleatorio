import { getDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase/config'
import { normalizeUserFromFirestore, userProfileDoc } from '../lib/firestoreUserProfile'
import { Send } from '../lib/icons'
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
          <button
            type="button"
            onClick={() => onAuthorClick?.(post.uid)}
            className="text-left text-xs text-slate-500 underline-offset-2 hover:text-primary hover:underline"
          >
            Por {author.nickname}#{author.tag}
          </button>
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
