import type { UserProfile } from '../types/models'
import { Copy, MessageCircle, Send, ShieldAlert, Star } from '../lib/icons'
import { openMessagesDockWithPeer } from '../lib/messageDock'
import { isPremiumActive, premiumVariantOf } from '../lib/plan'
import { hasSemiAleatorioSeal } from '../lib/seal'
import {
  STATUS_LABELS,
  formatEloDisplay,
  playerTagLabel,
  roleLabel,
} from '../lib/constants'
import { eloIconSrc } from '../lib/lolAssets'
import { LolEloIcon, LolRoleIcon } from './LolIcons'

const statusColors: Record<string, string> = {
  LFG: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40',
  PLAYING: 'bg-secondary/20 text-blue-300 ring-1 ring-secondary/40',
  OFFLINE: 'bg-muted/20 text-muted ring-1 ring-white/10',
}

function EloBadge({ elo }: { elo: string | undefined | null }) {
  const raw = elo?.trim() ? elo.trim() : 'UNRANKED'
  const shown = formatEloDisplay(raw)
  const hasIcon = Boolean(eloIconSrc(raw))
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md bg-[#1a2332] px-2 py-0.5 text-xs font-semibold text-slate-200 ring-1 ring-white/10"
      title={shown}
    >
      <LolEloIcon elo={raw} className="h-5 w-5" />
      {!hasIcon && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-primary/80" aria-hidden />
      )}
      {shown}
    </span>
  )
}

type Props = {
  player: UserProfile
  /** UID do utilizador autenticado — para mostrar «Mensagem» no mural. */
  viewerUid?: string
  onCall: () => void
  onCopy: () => void
  onFavorite?: () => void
  favorited?: boolean
  favoriteDisabled?: boolean
  isSeed?: boolean
  onReport?: () => void
}

export function PlayerCard({
  player,
  viewerUid,
  onCall,
  onCopy,
  onFavorite,
  favorited,
  favoriteDisabled,
  isSeed,
  onReport,
}: Props) {
  const seal = hasSemiAleatorioSeal(player) || player.semiAleatorio
  const premium = isPremiumActive(player)
  const premiumVar = premium ? premiumVariantOf(player) : null
  const boostEndMs =
    player.boostUntil &&
    typeof player.boostUntil.toMillis === 'function'
      ? player.boostUntil.toMillis()
      : 0
  const boosted = boostEndMs > Date.now()
  const boostRemainLabel = (() => {
    if (!boosted) return ''
    const totalMin = Math.ceil((boostEndMs - Date.now()) / 60_000)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`
  })()

  const isPro = premium && premiumVar === 'complete'
  const isEssential = premium && premiumVar === 'essential'

  const cardClass = isPro
    ? 'border-amber-400/60 bg-gradient-to-br from-amber-900/20 via-card to-card shadow-[0_0_20px_-5px_rgba(251,191,36,0.25)] hover:shadow-[0_0_28px_-4px_rgba(251,191,36,0.35)] hover:border-amber-400/80'
    : isEssential
      ? 'border-cyan-400/40 bg-gradient-to-br from-cyan-900/15 via-card to-card shadow-[0_0_16px_-5px_rgba(34,211,238,0.2)] hover:shadow-[0_0_22px_-4px_rgba(34,211,238,0.3)] hover:border-cyan-400/60'
      : boosted
        ? 'border-emerald-400/50 bg-gradient-to-br from-emerald-900/15 via-card to-card shadow-[0_0_16px_-5px_rgba(52,211,153,0.2)] hover:shadow-[0_0_22px_-4px_rgba(52,211,153,0.3)] hover:border-emerald-400/70'
        : 'border-border bg-card shadow-lg hover:border-primary/30'

  return (
    <article className={`relative flex flex-col overflow-hidden rounded-xl border p-4 transition-all duration-200 ${cardClass}`}>
      {isPro && (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(251,191,36,0.05)_45%,rgba(251,191,36,0.1)_50%,rgba(251,191,36,0.05)_55%,transparent_60%)] animate-[shimmer_3s_infinite]" />
      )}
      {isSeed && (
        <span className="absolute left-2 top-2 rounded bg-secondary/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-200">
          Exemplo
        </span>
      )}
      {boosted && (
        <span className={`absolute -right-1 -top-1 rounded-bl-lg rounded-tr-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${isPro ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950' : isEssential ? 'bg-gradient-to-r from-cyan-300 to-cyan-400 text-cyan-950' : 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-emerald-950'}`}>
          ⚡ {boostRemainLabel}
        </span>
      )}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3
            title={`${player.nickname}#${player.tag}`}
            className="cursor-help truncate text-lg font-semibold text-white"
          >
            {player.nickname}
            <span className="font-normal text-muted">#{player.tag}</span>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <EloBadge elo={player.elo} />
            {premium && (
              <span
                className={
                  isPro
                    ? 'rounded bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950 shadow-sm shadow-amber-400/30'
                    : 'rounded bg-gradient-to-r from-cyan-300 via-cyan-200 to-cyan-400 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-950 shadow-sm shadow-cyan-400/20'
                }
              >
                {premiumVar === 'essential' ? 'Premium' : 'Premium Pro'}
              </span>
            )}
            {seal && (
              <span
                className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-primary/40"
                title="Jogador bem avaliado pela comunidade"
              >
                SemAleatório ✔
              </span>
            )}
          </div>
        </div>
        <span
          title={STATUS_LABELS[player.status] ?? player.status}
          className={`max-w-[min(100%,11rem)] shrink rounded-lg px-2.5 py-1 text-left text-xs font-medium leading-snug break-words sm:max-w-[13rem] ${statusColors[player.status] ?? statusColors.OFFLINE}`}
        >
          {STATUS_LABELS[player.status] ?? player.status}
        </span>
      </div>

      {player.roles?.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <span>Rotas:</span>
          <span className="flex flex-wrap items-center gap-1.5">
            {player.roles.slice(0, 2).map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 font-medium text-slate-200"
              >
                <LolRoleIcon role={r} className="h-4 w-4" />
                {roleLabel(r)}
              </span>
            ))}
          </span>
        </div>
      )}

      {player.playerTags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {player.playerTags.map((t) => (
            <span
              key={t}
              className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-300"
            >
              {playerTagLabel(t)}
            </span>
          ))}
        </div>
      )}

      {player.bio ? (
        <p className="mt-2 line-clamp-2 text-sm text-slate-500">{player.bio}</p>
      ) : null}

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-400">
          Nota{' '}
          <span className="font-semibold text-white">
            {player.ratingCount > 0 ? player.ratingAvg.toFixed(1) : '—'}
          </span>
          {player.ratingCount > 0 && (
            <span className="text-slate-500"> ({player.ratingCount})</span>
          )}
        </span>
        {player.playingNow && (
          <span className="text-xs font-medium text-primary">Joga agora</span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="flex flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-black hover:bg-primary/90"
        >
          <Copy className="h-4 w-4 shrink-0" aria-hidden />
          Copiar nick
        </button>
        <button
          type="button"
          onClick={onCall}
          className="flex flex-1 min-w-[100px] items-center justify-center gap-1.5 rounded-lg border border-border bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
        >
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
          Chamar
        </button>
        {viewerUid && !isSeed && viewerUid !== player.uid && (
          <button
            type="button"
            onClick={() => openMessagesDockWithPeer(player.uid)}
            className="flex flex-1 min-w-[100px] items-center justify-center gap-1.5 rounded-lg border border-secondary/40 bg-secondary/15 px-3 py-2 text-sm font-medium text-blue-100 hover:bg-secondary/25"
          >
            <Send className="h-4 w-4 shrink-0" aria-hidden />
            Mensagem
          </button>
        )}
        {onFavorite && !isSeed && (
          <button
            type="button"
            disabled={favoriteDisabled}
            onClick={onFavorite}
            title={favoriteDisabled ? 'Limite do plano free' : undefined}
            className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Star
              className={`h-4 w-4 shrink-0 ${favorited ? 'fill-amber-400 text-amber-400' : ''}`}
              aria-hidden
            />
            <span className="sr-only">
              {favorited ? 'Remover favorito' : 'Favoritar'}
            </span>
          </button>
        )}
        {onReport && !isSeed && (
          <button
            type="button"
            onClick={onReport}
            title="Reportar jogador"
            className="inline-flex items-center justify-center rounded-lg border border-amber-900/50 px-3 py-2 text-sm text-amber-500/90 hover:bg-amber-950/40"
          >
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
            <span className="sr-only">Reportar</span>
          </button>
        )}
      </div>
    </article>
  )
}
