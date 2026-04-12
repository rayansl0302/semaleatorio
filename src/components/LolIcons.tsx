import { eloIconSrc, roleIconSrc } from '../lib/lolAssets'

type ImgProps = {
  className?: string
  title?: string
}

export function LolRoleIcon({
  role,
  className = 'h-5 w-5',
  title,
}: ImgProps & { role: string }) {
  const src = roleIconSrc(role)
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      title={title ?? role}
      className={`shrink-0 object-contain ${className}`.trim()}
      loading="lazy"
      decoding="async"
    />
  )
}

export function LolEloIcon({
  elo,
  className = 'h-7 w-7',
  title,
}: ImgProps & { elo: string }) {
  const src = eloIconSrc(elo)
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      title={title ?? elo}
      className={`shrink-0 object-contain ${className}`.trim()}
      loading="lazy"
      decoding="async"
    />
  )
}
