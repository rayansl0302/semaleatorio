import {
  Crown,
  MapPin,
  ShieldAlert,
  Sparkles,
  Swords,
  Trophy,
  User,
  Users,
  Zap,
} from '../../lib/icons'
import type { LucideIcon } from 'lucide-react'
import {
  formatEloDisplay,
  QUEUE_LABELS,
  STATUS_LABELS,
  roleLabel,
} from '../../lib/constants'
import { LolEloIcon, LolRoleIcon } from '../LolIcons'
import type { PlayerStatus, QueueType } from '../../types/models'

export type AdminUserSegment = 'free' | 'essential' | 'pro' | 'boost' | 'staff'

const SEGMENT_META: Record<
  AdminUserSegment,
  { Icon: LucideIcon; label: string; className: string }
> = {
  free: { Icon: User, label: 'Grátis', className: 'text-slate-400' },
  essential: { Icon: Sparkles, label: 'Premium', className: 'text-cyan-400' },
  pro: { Icon: Crown, label: 'Pro', className: 'text-amber-400' },
  boost: { Icon: Zap, label: 'Destaque', className: 'text-fuchsia-400' },
  staff: { Icon: ShieldAlert, label: 'Painel', className: 'text-rose-400' },
}

const QUEUE_ICONS: Record<QueueType, { Icon: LucideIcon; className: string }> = {
  duo: { Icon: Swords, className: 'text-amber-400/90' },
  flex: { Icon: Users, className: 'text-sky-400/90' },
  clash: { Icon: Trophy, className: 'text-violet-400/90' },
}

const STATUS_DOT: Record<PlayerStatus, string> = {
  LFG: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]',
  PLAYING: 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.35)]',
  OFFLINE: 'bg-slate-600',
}

/** Segmento (plano / destaque / staff) com ícone Lucide. */
export function AdminSegmentBadge({
  segment,
  compact,
}: {
  segment: AdminUserSegment
  compact?: boolean
}) {
  const { Icon, label, className } = SEGMENT_META[segment]
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${compact ? 'text-xs' : 'text-sm'} font-medium text-slate-200`}
      title={label}
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${className}`} aria-hidden />
      {!compact && <span>{label}</span>}
    </span>
  )
}

/** Elo com ícone de liga (assets públicos) + texto PT. */
export function AdminEloBadge({
  elo,
  className = '',
  iconClass = 'h-5 w-5',
}: {
  elo: string | undefined | null
  className?: string
  iconClass?: string
}) {
  const raw = elo?.trim() ? elo.trim() : 'UNRANKED'
  const shown = formatEloDisplay(raw)
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md bg-[#151c28] px-1.5 py-0.5 ring-1 ring-white/10 ${className}`.trim()}
      title={shown}
    >
      <LolEloIcon elo={raw} className={`shrink-0 ${iconClass}`.trim()} />
      <span className="min-w-0 truncate text-xs font-semibold tabular-nums text-slate-200">
        {shown}
      </span>
    </span>
  )
}

/** Ícones de rota (lane) + tooltip com nome PT. */
export function AdminRolesStrip({ roles }: { roles: string[] | undefined }) {
  const list = roles?.filter(Boolean) ?? []
  if (list.length === 0) {
    return <span className="text-xs text-slate-500">—</span>
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1" title={list.map(roleLabel).join(' · ')}>
      {list.map((r) => (
        <span
          key={r}
          className="inline-flex rounded-md bg-[#151c28] p-0.5 ring-1 ring-white/10"
          title={roleLabel(r)}
        >
          <LolRoleIcon role={r} className="h-5 w-5" />
        </span>
      ))}
    </span>
  )
}

/** Filas (duo / flex / clash) com ícones Lucide. */
export function AdminQueuesStrip({ queueTypes }: { queueTypes: QueueType[] | undefined }) {
  const list = queueTypes?.length ? queueTypes : []
  if (list.length === 0) {
    return <span className="text-xs text-slate-500">—</span>
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {list.map((q) => {
        const meta = QUEUE_ICONS[q]
        if (!meta) {
          return (
            <span
              key={q}
              className="rounded-md bg-[#151c28] px-1.5 py-0.5 text-[10px] text-slate-400 ring-1 ring-white/10"
            >
              {QUEUE_LABELS[q] ?? q}
            </span>
          )
        }
        const { Icon, className } = meta
        return (
          <span
            key={q}
            className="inline-flex items-center gap-1 rounded-md bg-[#151c28] px-1.5 py-0.5 ring-1 ring-white/10"
            title={QUEUE_LABELS[q] ?? q}
          >
            <Icon className={`h-3.5 w-3.5 shrink-0 ${className}`} aria-hidden />
            <span className="text-[10px] font-medium text-slate-300">{QUEUE_LABELS[q] ?? q}</span>
          </span>
        )
      })}
    </span>
  )
}

/** Estado LFG / em partida / offline. */
export function AdminStatusBadge({ status }: { status: PlayerStatus }) {
  const dot = STATUS_DOT[status] ?? STATUS_DOT.OFFLINE
  const label = STATUS_LABELS[status] ?? status
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md bg-[#151c28] px-2 py-0.5 ring-1 ring-white/10"
      title={label}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="text-xs font-medium text-slate-200">{status}</span>
    </span>
  )
}

/** Região com ícone. */
export function AdminRegionInline({ region }: { region: string | undefined | null }) {
  const r = region?.trim()
  if (!r) {
    return <span className="text-sm text-slate-500">—</span>
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-200">
      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
      {r}
    </span>
  )
}

/** Bloco compacto para tabela: elo + rotas empilhados. */
export function AdminGameTableCell({ profile }: { profile: { elo: string; roles: string[] } }) {
  return (
    <div className="flex min-w-0 max-w-[200px] flex-col gap-1.5 py-0.5">
      <AdminEloBadge elo={profile.elo} iconClass="h-4 w-4" />
      <AdminRolesStrip roles={profile.roles} />
    </div>
  )
}

/** Secção rica para modal admin (elo, rotas, filas, região, estado). */
export function AdminProfileGamePanel({
  elo,
  roles,
  queueTypes,
  region,
  status,
}: {
  elo: string
  roles: string[]
  queueTypes: QueueType[]
  region?: string | null
  status: PlayerStatus
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#121a26]/90 to-[#0c1017] p-4 ring-1 ring-white/[0.04]">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        League of Legends
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
        <div className="min-w-0 sm:min-w-[140px]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Elo</p>
          <div className="mt-1.5">
            <AdminEloBadge elo={elo} iconClass="h-6 w-6" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Rotas</p>
          <div className="mt-1.5">
            <AdminRolesStrip roles={roles} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Filas</p>
          <div className="mt-1.5">
            <AdminQueuesStrip queueTypes={queueTypes} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Estado</p>
          <div className="mt-1.5">
            <AdminStatusBadge status={status} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Região</p>
          <div className="mt-1.5">
            <AdminRegionInline region={region} />
          </div>
        </div>
      </div>
    </div>
  )
}
