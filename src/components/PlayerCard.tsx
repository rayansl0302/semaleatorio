import type { UserProfile } from '../types/models'
import { Copy, MessageCircle, Send, ShieldAlert, Star } from '../lib/icons'
import { openMessagesDockWithPeer } from '../lib/messageDock'
import { isPremiumActive } from '../lib/plan'
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
  const boosted =
    player.boostUntil &&
    typeof player.boostUntil.toMillis === 'function' &&
    player.boostUntil.toMillis() > Date.now()

  return (
    <article className="relative flex flex-col rounded-xl border border-border bg-card p-4 shadow-lg transition hover:border-primary/30">
      {isSeed && (
        <span className="absolute left-2 top-2 rounded bg-secondary/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-200">
          Exemplo
        </span>
      )}
      {boosted && (
        <span className="absolute -right-1 -top-1 rounded-bl-lg rounded-tr-lg bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
          Destaque
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {player.nickname}
            <span className="font-normal text-muted">#{player.tag}</span>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <EloBadge elo={player.elo} />
            {premium && (
              <span className="rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-0.5 text-[10px] font-bold uppercase text-black">
                Premium
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
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[player.status] ?? statusColors.OFFLINE}`}
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
