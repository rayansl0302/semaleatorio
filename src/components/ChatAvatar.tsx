import { useState } from 'react'

function hueFromUid(uid: string): number {
  let h = 0
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0
  return h % 360
}

const sizeClass = { sm: 'h-8 w-8 text-[11px]', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' } as const

type ChatAvatarProps = {
  uid: string
  /** Ex.: photoURL do Firebase Auth (Google). */
  photoUrl?: string | null
  /** Para inicial e alt. */
  label: string
  size?: keyof typeof sizeClass
  className?: string
}

export function ChatAvatar({ uid, photoUrl, label, size = 'sm', className = '' }: ChatAvatarProps) {
  const [imgOk, setImgOk] = useState(!!photoUrl)
  const initial = (label.trim()[0] ?? uid[0] ?? '?').toUpperCase()
  const hue = hueFromUid(uid)

  if (photoUrl && imgOk) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${sizeClass[size]} shrink-0 rounded-full object-cover ring-2 ring-black/20 ${className}`}
        onError={() => setImgOk(false)}
      />
    )
  }

  return (
    <div
      className={`flex ${sizeClass[size]} shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-black/25 ${className}`}
      style={{ backgroundColor: `hsl(${hue} 42% 36%)` }}
      aria-hidden
    >
      {initial}
    </div>
  )
}
