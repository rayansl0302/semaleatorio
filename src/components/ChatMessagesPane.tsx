import { useEffect, useRef, type ReactNode } from 'react'
import type { MessageDoc, UserProfile } from '../types/models'
import { ChatAvatar } from './ChatAvatar'
import {
  formatChatDaySeparator,
  formatMessageBubbleTime,
  formatMessageFullDateTime,
  messageNeedsDaySeparator,
} from '../lib/chatMessageFormat'

type ChatMessagesPaneProps = {
  messages: MessageDoc[]
  viewerUid: string
  viewerPhotoUrl?: string | null
  viewerLabel: string
  peerUid: string
  peerProfile: UserProfile | null
  peerLabelShort: string
  /** Fundo tipo conversa (padrão escuro verde-acinzentado). */
  className?: string
}

function peerSubtitle(profile: UserProfile | null): { text: string; online: boolean } {
  if (!profile?.lastOnline || typeof profile.lastOnline.toMillis !== 'function') {
    return { text: 'Última vez no app: sem registro', online: false }
  }
  const ms = Date.now() - profile.lastOnline.toMillis()
  if (ms < 5 * 60_000) {
    return { text: 'Ativo no app agora', online: true }
  }
  const ago = (() => {
    if (ms < 3600_000) return `há ${Math.max(1, Math.floor(ms / 60_000))} min`
    if (ms < 86400_000) return `há ${Math.floor(ms / 3600_000)} h`
    if (ms < 7 * 86400_000)
      return `há ${Math.floor(ms / 86400_000)} ${Math.floor(ms / 86400_000) === 1 ? 'dia' : 'dias'}`
    return `há ${Math.floor(ms / 86400_000)} d`
  })()
  return { text: `Última vez no app ${ago}`, online: false }
}

export function ChatThreadHeader({
  peerUid,
  peerProfile,
  peerLabelShort,
  compactLink,
  leadingSlot,
}: {
  peerUid: string
  peerProfile: UserProfile | null
  peerLabelShort: string
  compactLink?: ReactNode
  /** Ex.: botão voltar no dock. */
  leadingSlot?: ReactNode
}) {
  const sub = peerSubtitle(peerProfile)
  const label =
    peerProfile && peerProfile.nickname
      ? `${peerProfile.nickname}#${peerProfile.tag}`
      : peerLabelShort

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border/80 bg-[#1a232e] py-2.5 pl-2 pr-3">
      {leadingSlot}
      <ChatAvatar uid={peerUid} label={label} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-white">{label}</p>
        <p
          className={`truncate text-xs ${sub.online ? 'text-primary' : 'text-slate-400'}`}
        >
          {sub.online && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />}
          {sub.text}
        </p>
        {compactLink}
      </div>
    </div>
  )
}

export function ChatMessagesPane({
  messages,
  viewerUid,
  viewerPhotoUrl,
  viewerLabel,
  peerUid,
  peerProfile,
  peerLabelShort,
  className = '',
}: ChatMessagesPaneProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const peerDisplay =
    peerProfile && peerProfile.nickname
      ? `${peerProfile.nickname}#${peerProfile.tag}`
      : peerLabelShort

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, messages[messages.length - 1]?.id])

  return (
    <div
      className={`relative min-h-0 flex-1 overflow-y-auto bg-[#0b141a] ${className}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}
    >
      <div className="space-y-1 px-2 py-3">
        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const mine = m.fromUid === viewerUid
          const showDay = messageNeedsDaySeparator(prev, m)
          const newRunFromSender = i === 0 || messages[i - 1]?.fromUid !== m.fromUid
          const timeStr = formatMessageBubbleTime(m.createdAt)
          const fullTime = formatMessageFullDateTime(m.createdAt)

          return (
            <div key={m.id}>
              {showDay && m.createdAt && typeof m.createdAt.toDate === 'function' && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-lg bg-[#1c272d]/95 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 shadow-sm">
                    {formatChatDaySeparator(m.createdAt.toDate())}
                  </span>
                </div>
              )}
              <div
                className={`flex items-end gap-1.5 ${mine ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className="w-9 shrink-0">
                  {newRunFromSender ? (
                    mine ? (
                      <ChatAvatar
                        uid={viewerUid}
                        photoUrl={viewerPhotoUrl}
                        label={viewerLabel}
                        size="sm"
                      />
                    ) : (
                      <ChatAvatar uid={peerUid} label={peerDisplay} size="sm" />
                    )
                  ) : (
                    <span className="block h-8 w-8" aria-hidden />
                  )}
                </div>
                <div
                  className={`group relative max-w-[min(78%,320px)] rounded-lg px-2.5 pb-1.5 pt-1.5 shadow-sm ${
                    mine
                      ? 'rounded-br-sm bg-[#005c4b] text-[#e9edef]'
                      : 'rounded-bl-sm bg-[#1f2c34] text-[#e9edef]'
                  }`}
                  title={fullTime || undefined}
                >
                  <p className="whitespace-pre-wrap break-words pr-12 text-[14px] leading-snug">
                    {m.text}
                  </p>
                  {timeStr ? (
                    <span
                      className={`absolute bottom-1 right-2 text-[10px] tabular-nums ${
                        mine ? 'text-[#9fb3ad]' : 'text-slate-500'
                      }`}
                    >
                      {timeStr}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} className="h-1 shrink-0" aria-hidden />
      </div>
    </div>
  )
}
