import { collection, onSnapshot } from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Copy, ExternalLink, Search } from 'lucide-react'
import {
  AdminGameTableCell,
  AdminProfileGamePanel,
  AdminSegmentBadge,
  AdminStatusBadge,
} from '../../components/admin/AdminGameDisplay'
import { AdminModal, AdminModalSection } from '../../components/admin/AdminModal'
import { AdminPaginationBar } from '../../components/admin/AdminPaginationBar'
import { db } from '../../firebase/config'
import { useUserWebhookEvents } from '../../hooks/useUserWebhookEvents'
import { adminProductLabel } from '../../lib/adminProductLabels'
import { normalizeUserFromFirestore } from '../../lib/firestoreUserProfile'
import { isPremiumActive, premiumVariantOf } from '../../lib/plan'
import { formatBrl } from '../../lib/formatBrl'
import { getPublicSiteUrl } from '../../lib/siteUrl'
import type { UserProfile } from '../../types/models'

function formatRemaining(ms: number | null): string {
  if (ms == null || ms <= Date.now()) return '—'
  const diff = ms - Date.now()
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

type UserSegment = 'free' | 'essential' | 'pro' | 'boost' | 'staff'

function userSegment(p: UserProfile): UserSegment {
  if (p.adminPanelOnly) return 'staff'
  if (isPremiumActive(p) && premiumVariantOf(p) === 'complete') return 'pro'
  if (isPremiumActive(p)) return 'essential'
  const b = p.boostUntil
  if (b && typeof b.toMillis === 'function' && b.toMillis() > Date.now()) return 'boost'
  return 'free'
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function UserPaymentHistoryBlock({
  uid,
  onOpenPayment,
}: {
  uid: string
  onOpenPayment?: (paymentId: string) => void
}) {
  const { rows, loading, error } = useUserWebhookEvents(uid, 50)

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[11px] text-slate-500">
        Até 50 eventos mais recentes (webhook Asaas).
        {onOpenPayment ? ' Clica numa linha para abrir o detalhe do pagamento.' : ''}
      </p>
      {loading && <p className="mt-3 text-xs text-slate-500">A carregar…</p>}
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="mt-3 text-xs text-slate-500">Nenhum pagamento registado.</p>
      )}
      {rows.length > 0 && (
        <div className="mt-3 max-h-52 overflow-auto rounded-lg border border-white/[0.06]">
          <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 z-[1] bg-[#0d1219] text-[10px] uppercase text-slate-500 shadow-sm shadow-black/40">
              <tr>
                <th className="px-2 py-1.5">Data</th>
                <th className="px-2 py-1.5 text-right">Valor</th>
                <th className="px-2 py-1.5">Produto</th>
                <th className="px-2 py-1.5 font-mono">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-slate-300">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={
                    onOpenPayment
                      ? 'cursor-pointer hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-inset'
                      : 'hover:bg-white/[0.03]'
                  }
                  onClick={onOpenPayment ? () => onOpenPayment(r.id) : undefined}
                  onKeyDown={
                    onOpenPayment
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onOpenPayment(r.id)
                          }
                        }
                      : undefined
                  }
                  tabIndex={onOpenPayment ? 0 : undefined}
                  role={onOpenPayment ? 'button' : undefined}
                  aria-label={
                    onOpenPayment ? `Abrir pagamento ${r.id}` : undefined
                  }
                >
                  <td className="whitespace-nowrap px-2 py-1.5">{r.atLabel}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-emerald-300/90">
                    {r.value != null ? formatBrl(r.value) : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="text-primary">{adminProductLabel(r.productRef ?? '?')}</span>
                  </td>
                  <td className="max-w-[100px] truncate px-2 py-1.5 font-mono text-[10px] text-slate-500">
                    {r.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function AdminUsersPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [users, setUsers] = useState<UserProfile[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState<'all' | UserSegment>('all')
  const [shadow, setShadow] = useState<'all' | 'yes' | 'no'>('all')
  const [sort, setSort] = useState<'activity' | 'nick' | 'uid'>('activity')
  const [detail, setDetail] = useState<UserProfile | null>(null)
  const [copyFlash, setCopyFlash] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    if (!db) return
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list: UserProfile[] = []
        snap.forEach((d) => {
          const p = normalizeUserFromFirestore(d.data(), d.id)
          if (p) list.push(p)
        })
        setUsers(list)
        setErr(null)
      },
      (e) => setErr(e.message),
    )
    return () => unsub()
  }, [])

  useEffect(() => {
    const uid = searchParams.get('user')
    if (!uid || users.length === 0) return
    setSearch(uid)
    const found = users.find((p) => p.uid === uid)
    if (found) setDetail(found)
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        n.delete('user')
        return n
      },
      { replace: true },
    )
  }, [users, searchParams, setSearchParams])

  useEffect(() => {
    setPage(1)
  }, [search, segment, shadow, sort])

  const flashCopy = useCallback((key: string) => {
    setCopyFlash(key)
    window.setTimeout(() => setCopyFlash(null), 1600)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = users.filter((p) => {
      if (segment !== 'all' && userSegment(p) !== segment) return false
      if (shadow === 'yes' && !p.shadowBanned) return false
      if (shadow === 'no' && p.shadowBanned) return false
      if (!q) return true
      const nick = `${p.nickname}#${p.tag}`.toLowerCase()
      return (
        nick.includes(q) ||
        p.uid.toLowerCase().includes(q) ||
        (p.profileSlug?.toLowerCase().includes(q) ?? false) ||
        (p.elo?.toLowerCase().includes(q) ?? false)
      )
    })
    if (sort === 'nick') {
      list = [...list].sort((a, b) =>
        `${a.nickname}#${a.tag}`.localeCompare(`${b.nickname}#${b.tag}`, 'pt', {
          sensitivity: 'base',
        }),
      )
    } else if (sort === 'uid') {
      list = [...list].sort((a, b) => a.uid.localeCompare(b.uid))
    } else {
      list = [...list].sort(
        (a, b) => (b.lastOnline?.toMillis?.() ?? 0) - (a.lastOnline?.toMillis?.() ?? 0),
      )
    }
    return list
  }, [users, search, segment, shadow, sort])

  const pageCount = Math.ceil(filtered.length / pageSize) || 1
  const pageSafe = Math.min(page, pageCount)
  const pagedRows = useMemo(() => {
    const start = (pageSafe - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, pageSafe, pageSize])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const stats = useMemo(() => {
    const base = filtered
    const counts: Record<UserSegment, number> = {
      free: 0,
      essential: 0,
      pro: 0,
      boost: 0,
      staff: 0,
    }
    for (const p of base) {
      counts[userSegment(p)] += 1
    }
    return {
      total: users.length,
      shown: base.length,
      shadowed: base.filter((p) => p.shadowBanned).length,
      counts,
    }
  }, [users.length, filtered])

  return (
    <>
      <Helmet>
        <title>Admin · Utilizadores · SemAleatório</title>
      </Helmet>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Utilizadores</h1>
          <p className="mt-1 text-sm text-slate-500">
            Filtros em tempo real, paginação e modal de detalhe com histórico de pagamentos.
          </p>
        </div>
      </div>
      {err && <p className="mt-4 text-sm text-red-400">{err}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-semibold uppercase text-slate-500">Total Firestore</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-semibold uppercase text-slate-500">Após filtros</p>
          <p className="mt-1 text-2xl font-bold text-primary">{stats.shown}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-semibold uppercase text-slate-500">Shadow (na lista)</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{stats.shadowed}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-slate-400">
          <p className="text-[11px] font-semibold uppercase text-slate-500">Segmentos (filtrados)</p>
          <p className="mt-2 leading-relaxed">
            Grátis {stats.counts.free} · Prem. {stats.counts.essential} · Pro{' '}
            {stats.counts.pro} · Dest. {stats.counts.boost} · Painel {stats.counts.staff}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
          <label className="lg:col-span-4">
            <span className="text-xs font-medium text-slate-500">Pesquisar</span>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nick, UID, slug público, elo…"
                className="w-full rounded-lg border border-border bg-bg py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-600"
              />
            </div>
          </label>
          <label className="lg:col-span-2">
            <span className="text-xs font-medium text-slate-500">Segmento</span>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value as typeof segment)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
            >
              <option value="all">Todos</option>
              <option value="free">Grátis</option>
              <option value="essential">Premium</option>
              <option value="pro">Pro</option>
              <option value="boost">Destaque</option>
              <option value="staff">Só painel admin</option>
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="text-xs font-medium text-slate-500">Shadow ban</span>
            <select
              value={shadow}
              onChange={(e) => setShadow(e.target.value as typeof shadow)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
            >
              <option value="all">Todos</option>
              <option value="yes">Só shadow</option>
              <option value="no">Sem shadow</option>
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="text-xs font-medium text-slate-500">Ordenar</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
            >
              <option value="activity">Última actividade</option>
              <option value="nick">Nick A–Z</option>
              <option value="uid">UID</option>
            </select>
          </label>
          <div className="flex items-end lg:col-span-2">
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSegment('all')
                setShadow('all')
                setSort('activity')
              }}
              className="w-full rounded-lg border border-border py-2 text-sm text-slate-300 transition hover:bg-white/5"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-border bg-bg/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Nick</th>
                <th className="px-3 py-2">Segmento</th>
                <th className="px-3 py-2">Jogo</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Premium até</th>
                <th className="px-3 py-2">Destaque até</th>
                <th className="px-3 py-2">Restante</th>
                <th className="px-3 py-2 font-mono">UID</th>
                <th className="px-3 py-2 text-right"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {pagedRows.map((p) => {
                const pu = p.premiumUntil?.toMillis?.() ?? null
                const bu = p.boostUntil?.toMillis?.() ?? null
                const rem =
                  isPremiumActive(p) && pu
                    ? formatRemaining(pu)
                    : bu && bu > Date.now()
                      ? formatRemaining(bu)
                      : '—'
                const seg = userSegment(p)
                return (
                  <tr key={p.uid} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-medium text-white">
                      {p.nickname}
                      <span className="text-slate-500">#{p.tag}</span>
                      {p.shadowBanned && (
                        <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-px text-[10px] font-bold text-amber-300">
                          shadow
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <AdminSegmentBadge segment={seg} />
                    </td>
                    <td className="px-3 py-2">
                      <AdminGameTableCell profile={{ elo: p.elo, roles: p.roles }} />
                    </td>
                    <td className="px-3 py-2">
                      <AdminStatusBadge status={p.status} />
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {pu && pu > Date.now() ? new Date(pu).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {bu && bu > Date.now() ? new Date(bu).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="px-3 py-2 text-primary">{rem}</td>
                    <td className="max-w-[120px] truncate px-3 py-2 font-mono text-[10px] text-slate-500">
                      {p.uid}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setDetail(p)}
                        className="rounded-lg border border-border px-2 py-1 text-xs text-primary hover:bg-primary/10"
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && !err && (
            <p className="p-8 text-center text-sm text-slate-500">Nenhum perfil com estes filtros.</p>
          )}
        </div>
        <AdminPaginationBar
          page={pageSafe}
          pageCount={pageCount}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <AdminModal
        open={detail != null}
        onClose={() => setDetail(null)}
        size="lg"
        ariaLabel="Detalhe do utilizador"
        header={
          <div>
            <p className="text-lg font-bold tracking-tight text-white">
              {detail?.nickname}
              <span className="font-normal text-slate-500">#{detail?.tag}</span>
            </p>
            {detail && (
              <p className="mt-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5">
                  <AdminSegmentBadge segment={userSegment(detail)} compact={false} />
                </span>
              </p>
            )}
          </div>
        }
      >
        {detail && (
          <>
            <AdminModalSection title="Acções rápidas">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void copyText(detail.uid).then((ok) => ok && flashCopy('uid'))
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-white/15 hover:bg-white/[0.08]"
                >
                  <Copy className="h-3.5 w-3.5 opacity-80" />
                  {copyFlash === 'uid' ? 'Copiado' : 'Copiar UID'}
                </button>
                {detail.profileSlug && (
                  <>
                    <Link
                      to={`/u/${encodeURIComponent(detail.profileSlug)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-primary/35 bg-primary/15 px-3.5 py-2 text-xs font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/25"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Perfil público
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        void copyText(`${getPublicSiteUrl()}/u/${detail.profileSlug}`).then(
                          (ok) => ok && flashCopy('url'),
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-white/15 hover:bg-white/[0.08]"
                    >
                      <Copy className="h-3.5 w-3.5 opacity-80" />
                      {copyFlash === 'url' ? 'Copiado' : 'Copiar URL'}
                    </button>
                  </>
                )}
              </div>
            </AdminModalSection>

            <AdminModalSection title="Dados do perfil" className="mt-8">
              <AdminProfileGamePanel
                elo={detail.elo}
                roles={detail.roles}
                queueTypes={detail.queueTypes}
                region={detail.region}
                status={detail.status}
              />
              <dl className="mt-6 grid gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-3">
                <DetailRow label="UID" value={detail.uid} mono />
                <DetailRow label="Slug" value={detail.profileSlug ?? '—'} />
                <DetailRow
                  label="Avaliação"
                  value={
                    detail.ratingCount > 0
                      ? `${detail.ratingAvg.toFixed(1)} (${detail.ratingCount})`
                      : '—'
                  }
                />
                <DetailRow label="SemiAleatório" value={detail.semiAleatorio ? 'sim' : 'não'} />
                <DetailRow label="A jogar agora" value={detail.playingNow ? 'sim' : 'não'} />
                <DetailRow
                  label="Última actividade"
                  value={
                    detail.lastOnline?.toMillis?.()
                      ? new Date(detail.lastOnline.toMillis()).toLocaleString('pt-BR')
                      : '—'
                  }
                />
                <DetailRow
                  label="Criado"
                  value={
                    detail.createdAt?.toMillis?.()
                      ? new Date(detail.createdAt.toMillis()).toLocaleString('pt-BR')
                      : '—'
                  }
                />
                <DetailRow label="Bio" value={detail.bio?.trim() ? detail.bio : '—'} multiline />
                <DetailRow label="Tags jogador" value={detail.playerTags?.join(', ') || '—'} />
                <DetailRow label="Favoritos (n)" value={String(detail.favoriteUids?.length ?? 0)} />
                <DetailRow
                  label="Denúncias"
                  value={detail.reportsCount != null ? String(detail.reportsCount) : '—'}
                />
                <DetailRow label="Shadow ban" value={detail.shadowBanned ? 'sim' : 'não'} />
                <DetailRow label="Plano (doc)" value={detail.plan} />
                <DetailRow
                  label="Variante premium"
                  value={detail.premiumVariant ?? '—'}
                />
                <DetailRow
                  label="Premium até"
                  value={
                    detail.premiumUntil?.toMillis?.()
                      ? new Date(detail.premiumUntil.toMillis()).toLocaleString('pt-BR')
                      : '—'
                  }
                />
                <DetailRow
                  label="Boost até"
                  value={
                    detail.boostUntil?.toMillis?.()
                      ? new Date(detail.boostUntil.toMillis()).toLocaleString('pt-BR')
                      : '—'
                  }
                />
                <DetailRow label="Painel só admin" value={detail.adminPanelOnly ? 'sim' : 'não'} />
                <DetailRow label="Riot PUUID" value={detail.riotPuuid ?? '—'} mono />
                <DetailRow label="Asaas customer" value={detail.asaasCustomerId ?? '—'} mono />
                <DetailRow
                  label="CPF (últimos 4)"
                  value={
                    detail.cpf && detail.cpf.length >= 4
                      ? `***${detail.cpf.slice(-4)}`
                      : detail.cpf
                        ? '***'
                        : '—'
                  }
                />
                <DetailRow
                  label="Push (tokens)"
                  value={String(detail.fcmTokens?.length ?? 0)}
                />
              </dl>
            </AdminModalSection>

            <AdminModalSection title="Pagamentos" className="mt-8">
              <UserPaymentHistoryBlock
                uid={detail.uid}
                onOpenPayment={(paymentId) =>
                  navigate(`/admin/payments?payment=${encodeURIComponent(paymentId)}`)
                }
              />
            </AdminModalSection>
          </>
        )}
      </AdminModal>
    </>
  )
}

function DetailRow({
  label,
  value,
  mono,
  multiline,
}: {
  label: string
  value: string
  mono?: boolean
  multiline?: boolean
}) {
  return (
    <div className="sm:min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={`mt-1 text-sm text-slate-100 ${mono ? 'font-mono text-xs break-all text-slate-300' : ''} ${multiline ? 'whitespace-pre-wrap text-slate-300' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}
