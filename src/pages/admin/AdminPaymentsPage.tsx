import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Copy, ExternalLink, RefreshCw, Search, User } from 'lucide-react'
import {
  AdminEloBadge,
  AdminRegionInline,
  AdminRolesStrip,
} from '../../components/admin/AdminGameDisplay'
import { AdminModal, AdminModalSection } from '../../components/admin/AdminModal'
import { AdminPaginationBar } from '../../components/admin/AdminPaginationBar'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../firebase/config'
import { labelAsaasWebhookEventPt } from '../../lib/asaasWebhookEventLabels'
import { adminProductLabel } from '../../lib/adminProductLabels'
import { normalizeUserFromFirestore } from '../../lib/firestoreUserProfile'
import { coerceAmountBrl } from '../../lib/coerceAmountBrl'
import { formatBrl } from '../../lib/formatBrl'
import { catalogPriceBrlFromProductRef } from '../../lib/pricing'
import {
  adminSyncWebhookPaymentsFromAsaas,
  isBackendConfigured,
} from '../../lib/asaasPublic'
import { foldDiacriticsLower } from '../../lib/searchNormalize'
import type { UserProfile } from '../../types/models'

function payerNickCell(payer: UserProfile | undefined): string {
  if (!payer) return '—'
  return `${payer.nickname}#${payer.tag}`
}

type Row = {
  id: string
  event?: string
  eventId?: string
  uid?: string
  productRef?: string
  /** Valor bruto em R$ (gravado pelo webhook). */
  value?: number
  /** true quando `value` veio do catálogo (webhook sem valor no JSON). */
  valueFromCatalog?: boolean
  netValue?: number
  billingType?: string
  processedAtMs: number
  atLabel: string
}

type WebhookDoc = {
  event?: string
  eventId?: string
  uid?: string
  productRef?: string
  value?: unknown
  netValue?: unknown
  billingType?: string
  valueFromCatalog?: unknown
  processedAt?: { toMillis?: () => number; toDate?: () => Date }
}

function readFirestoreNumber(v: unknown): number | undefined {
  return coerceAmountBrl(v)
}

/**
 * Valor a mostrar: Firestore ou preço de catálogo.
 * `isEstimate` só quando **não** existe `value` no doc e usamos o catálogo — se há `value` gravado,
 * não mostramos «referência» (o flag `valueFromCatalog` pode estar errado em registos antigos).
 */
function paymentDisplayAmount(row: Row): { brl: number; isEstimate: boolean } | null {
  const v = coerceAmountBrl(row.value)
  if (v != null && Number.isFinite(v)) {
    return { brl: v, isEstimate: false }
  }
  const cat = catalogPriceBrlFromProductRef(row.productRef)
  if (cat != null) return { brl: cat, isEstimate: true }
  return null
}

function processedMs(x: { processedAt?: { toMillis?: () => number; toDate?: () => Date } }): number {
  const t = x.processedAt
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (typeof t.toDate === 'function') return t.toDate().getTime()
  return 0
}

function rowFromWebhookData(id: string, x: WebhookDoc): Row {
  const processedAtMs = processedMs(x)
  const atLabel =
    processedAtMs > 0 ? new Date(processedAtMs).toLocaleString('pt-BR') : '—'
  return {
    id,
    event: x.event,
    eventId: x.eventId,
    uid: x.uid,
    productRef: x.productRef,
    value: readFirestoreNumber(x.value),
    valueFromCatalog: x.valueFromCatalog === true,
    netValue: readFirestoreNumber(x.netValue),
    billingType:
      typeof x.billingType === 'string' && x.billingType.trim() !== ''
        ? x.billingType.trim()
        : undefined,
    processedAtMs,
    atLabel,
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

type Period = 'all' | 'today' | '7d' | '30d'

function periodStartMs(p: Period): number {
  const now = Date.now()
  if (p === 'all') return 0
  if (p === 'today') {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  if (p === '7d') return now - 7 * 86400000
  return now - 30 * 86400000
}

export function AdminPaymentsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [product, setProduct] = useState<string>('all')
  const [period, setPeriod] = useState<Period>('all')
  const [detail, setDetail] = useState<Row | null>(null)
  const [payerProfile, setPayerProfile] = useState<UserProfile | null>(null)
  const [payerLoading, setPayerLoading] = useState(false)
  const [copyFlash, setCopyFlash] = useState<string | null>(null)
  const [syncingAsaas, setSyncingAsaas] = useState(false)
  const [asaasSyncBanner, setAsaasSyncBanner] = useState<{
    kind: 'ok' | 'err'
    text: string
  } | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [userByUid, setUserByUid] = useState<Record<string, UserProfile>>({})
  /** Total líquido: omitido por defeito até «Mostrar». */
  const [showLiquidTotal, setShowLiquidTotal] = useState(false)

  useEffect(() => {
    if (!db) return
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const next: Record<string, UserProfile> = {}
        snap.forEach((d) => {
          const p = normalizeUserFromFirestore(d.data(), d.id)
          if (p) next[d.id] = p
        })
        setUserByUid(next)
      },
      () => {
        /* falha silenciosa: pesquisa por nome fica só com UID até voltar a carregar */
      },
    )
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!db) return
    const q = query(
      collection(db, 'webhook_events'),
      orderBy('processedAt', 'desc'),
      limit(500),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Row[] = []
        snap.forEach((d) => {
          list.push(rowFromWebhookData(d.id, d.data() as WebhookDoc))
        })
        setRows(list)
        setErr(null)
      },
      (e) => setErr(e.message),
    )
    return () => unsub()
  }, [])

  useEffect(() => {
    const uid = detail?.uid?.trim()
    if (!uid || !db) {
      setPayerProfile(null)
      setPayerLoading(false)
      return
    }
    setPayerLoading(true)
    setPayerProfile(null)
    let cancelled = false
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid))
        if (cancelled) return
        if (!snap.exists()) setPayerProfile(null)
        else setPayerProfile(normalizeUserFromFirestore(snap.data(), snap.id))
      } catch {
        if (!cancelled) setPayerProfile(null)
      } finally {
        if (!cancelled) setPayerLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [detail?.uid])

  const syncWebhookPaymentsFromAsaas = useCallback(async () => {
    if (!user || !db || !isBackendConfigured()) return
    setSyncingAsaas(true)
    setAsaasSyncBanner(null)
    try {
      const token = await user.getIdToken()
      const r = await adminSyncWebhookPaymentsFromAsaas({
        firebaseIdToken: token,
        limit: 500,
      })
      if (detail) {
        const snap = await getDoc(doc(db, 'webhook_events', detail.id))
        if (snap.exists()) {
          setDetail(rowFromWebhookData(snap.id, snap.data() as WebhookDoc))
        }
      }
      setAsaasSyncBanner({
        kind: 'ok',
        text: `Sincronização concluída: ${r.examined} registos analisados, ${r.updated} actualizados, ${r.noChange} sem alterações, ${r.skippedRef} ignorados (referência), ${r.asaasError} falhas Asaas.`,
      })
    } catch (e) {
      setAsaasSyncBanner({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Falhou a sincronização.',
      })
    } finally {
      setSyncingAsaas(false)
    }
  }, [user, detail, db])

  useEffect(() => {
    const paymentId = searchParams.get('payment')?.trim()
    if (!paymentId) return

    const fromList = rows.find((r) => r.id === paymentId)
    if (fromList) {
      setDetail(fromList)
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev)
          n.delete('payment')
          return n
        },
        { replace: true },
      )
      return
    }

    if (!db) return

    let cancelled = false
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, 'webhook_events', paymentId))
        if (cancelled) return
        if (snap.exists()) {
          setDetail(rowFromWebhookData(snap.id, snap.data() as WebhookDoc))
        }
      } catch {
        /* ignora */
      } finally {
        if (!cancelled) {
          setSearchParams(
            (prev) => {
              const n = new URLSearchParams(prev)
              n.delete('payment')
              return n
            },
            { replace: true },
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, rows, setSearchParams])

  useEffect(() => {
    setPage(1)
  }, [search, product, period])

  const productOptions = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) {
      if (r.productRef) s.add(r.productRef)
    }
    return [...s].sort()
  }, [rows])

  const filtered = useMemo(() => {
    const tokens = search
      .trim()
      .split(/\s+/)
      .map((t) => foldDiacriticsLower(t))
      .filter(Boolean)
    const t0 = periodStartMs(period)
    return rows.filter((r) => {
      if (period !== 'all' && r.processedAtMs < t0) return false
      if (product !== 'all' && r.productRef !== product) return false
      if (tokens.length === 0) return true

      const uidKey = r.uid?.trim() ?? ''
      const payer = uidKey ? userByUid[uidKey] : undefined
      const eventLabelPt = r.event ? labelAsaasWebhookEventPt(r.event) : ''
      const productLabel = r.productRef ? adminProductLabel(r.productRef) : ''

      const dispAmt = paymentDisplayAmount(r)
      const valStr = dispAmt ? String(dispAmt.brl) : ''
      const valFmt = dispAmt ? formatBrl(dispAmt.brl) : ''

      const hay = foldDiacriticsLower(
        [
          r.id,
          uidKey,
          r.productRef ?? '',
          productLabel,
          r.event ?? '',
          eventLabelPt,
          r.eventId ?? '',
          valStr,
          valFmt,
          r.billingType ?? '',
          payer ? payer.nickname : '',
          payer ? payer.tag : '',
          payer ? `${payer.nickname}#${payer.tag}` : '',
          payer?.profileSlug ?? '',
        ].join(' '),
      )

      return tokens.every((tok) => hay.includes(tok))
    })
  }, [rows, search, product, period, userByUid])

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
    const byProduct = new Map<string, number>()
    let liquidSum = 0
    let liquidRowsWithNet = 0
    for (const r of filtered) {
      const k = r.productRef ?? '?'
      byProduct.set(k, (byProduct.get(k) ?? 0) + 1)
      const n = r.netValue
      if (n != null && Number.isFinite(n)) {
        liquidSum += n
        liquidRowsWithNet += 1
      }
    }
    const top = [...byProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    return {
      totalFirestore: rows.length,
      shown: filtered.length,
      top,
      liquidSum,
      liquidRowsWithNet,
    }
  }, [rows.length, filtered])

  const flashCopy = useCallback((key: string) => {
    setCopyFlash(key)
    window.setTimeout(() => setCopyFlash(null), 1600)
  }, [])

  return (
    <>
      <Helmet>
        <title>Admin · Pagamentos · SemAleatório</title>
      </Helmet>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">Histórico de pagamentos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registos em <span className="font-mono text-slate-400">webhook_events</span> (últimos 500).
            Paginação sobre a lista filtrada. Pesquisa inclui nome, tag e slug do utilizador (via{' '}
            <span className="font-mono text-slate-400">users</span>). Modal para detalhes; ligação à ficha do
            utilizador.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <button
            type="button"
            disabled={syncingAsaas || !user || !isBackendConfigured()}
            title={
              !isBackendConfigured()
                ? 'Defina VITE_BACKEND_URL no front e faça deploy do backend com este endpoint.'
                : 'Consulta o Asaas para os 500 pagamentos mais recentes e actualiza valor, líquido e método no Firestore.'
            }
            onClick={() => void syncWebhookPaymentsFromAsaas()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-100/95 transition hover:border-amber-500/50 hover:bg-amber-500/15 disabled:pointer-events-none disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 opacity-90 ${syncingAsaas ? 'animate-spin' : ''}`} />
            {syncingAsaas ? 'A sincronizar…' : 'Sincronizar com Asaas (500 recentes)'}
          </button>
        </div>
      </div>
      {asaasSyncBanner ? (
        <p
          className={
            asaasSyncBanner.kind === 'err'
              ? 'mt-3 text-sm text-red-400/95'
              : 'mt-3 text-sm text-slate-400'
          }
        >
          {asaasSyncBanner.text}
        </p>
      ) : null}
      {err && <p className="mt-4 text-sm text-red-400">{err}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-semibold uppercase text-slate-500">Registos carregados</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats.totalFirestore}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-semibold uppercase text-slate-500">Após filtros</p>
          <p className="mt-1 text-2xl font-bold text-primary">{stats.shown}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 lg:col-span-2">
          <p className="text-[11px] font-semibold uppercase text-slate-500">Top produtos (lista filtrada)</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {stats.top.length === 0
              ? '—'
              : stats.top
                  .map(([k, n]) => `${adminProductLabel(k)} (${n})`)
                  .join(' · ')}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase text-slate-500">
            Ganho líquido (lista filtrada)
          </p>
          <button
            type="button"
            onClick={() => setShowLiquidTotal((v) => !v)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/5"
          >
            {showLiquidTotal ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {showLiquidTotal ? (
          <>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-400/95">
              {formatBrl(stats.liquidSum)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Soma dos valores líquidos (<span className="font-mono">netValue</span> do Asaas) nos{' '}
              {stats.liquidRowsWithNet} registos que têm esse campo, entre os {stats.shown} visíveis com os filtros
              actuais. Pagamentos sem líquido gravado não entram no total — use «Sincronizar com Asaas» para
              preencher.
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-slate-600">
            Total omitido. Mostre quando quiser ver quanto já entrou de líquido na plataforma (só com base nos
            registos e filtros actuais).
          </p>
        )}
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
                placeholder="Nome, tag, slug, UID, payment, produto, evento…"
                className="w-full rounded-lg border border-border bg-bg py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-600"
              />
            </div>
          </label>
          <label className="lg:col-span-3">
            <span className="text-xs font-medium text-slate-500">Produto</span>
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
            >
              <option value="all">Todos</option>
              {productOptions.map((p) => (
                <option key={p} value={p}>
                  {adminProductLabel(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="text-xs font-medium text-slate-500">Período</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
            >
              <option value="all">Todo o histórico</option>
              <option value="today">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </select>
          </label>
          <div className="flex items-end lg:col-span-3">
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setProduct('all')
                setPeriod('all')
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
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="border-b border-border bg-bg/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Invocador</th>
                <th className="px-3 py-2">UID</th>
                <th className="px-3 py-2">Evento</th>
                <th className="px-3 py-2 font-mono">Payment ID</th>
                <th className="px-3 py-2 text-right"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {pagedRows.map((r) => {
                const uidK = r.uid?.trim() ?? ''
                const payer = uidK ? userByUid[uidK] : undefined
                return (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2 text-slate-300">{r.atLabel}</td>
                  <td className="px-3 py-2 text-right">
                    {(() => {
                      const d = paymentDisplayAmount(r)
                      if (!d) {
                        return <span className="text-slate-500">—</span>
                      }
                      return (
                        <div
                          title={
                            d.isEstimate
                              ? 'Referência do catálogo (documento antigo ou webhook sem valor no JSON)'
                              : undefined
                          }
                        >
                          <span className="whitespace-nowrap tabular-nums font-medium text-emerald-300/95">
                            {formatBrl(d.brl)}
                          </span>
                          {d.isEstimate ? (
                            <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-wide text-amber-400/85">
                              ref.
                            </span>
                          ) : null}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs text-primary">{r.productRef ?? '—'}</span>
                    {r.productRef && (
                      <span className="ml-2 text-xs text-slate-500">
                        {adminProductLabel(r.productRef)}
                      </span>
                    )}
                  </td>
                  <td
                    className="max-w-[180px] truncate px-3 py-2 text-sm font-medium text-slate-200"
                    title={payerNickCell(payer)}
                  >
                    {payerNickCell(payer)}
                  </td>
                  <td className="max-w-[120px] truncate px-3 py-2 font-mono text-[10px] text-slate-500">
                    {r.uid ?? '—'}
                  </td>
                  <td
                    className="max-w-[220px] truncate px-3 py-2 text-slate-200"
                    title={r.event ? `${labelAsaasWebhookEventPt(r.event)} (${r.event})` : undefined}
                  >
                    {r.event ? labelAsaasWebhookEventPt(r.event) : '—'}
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2 font-mono text-[10px] text-slate-500">
                    {r.id}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setDetail(r)}
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
            <p className="p-8 text-center text-sm text-slate-500">Nenhum registo com estes filtros.</p>
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
        ariaLabel="Detalhe do pagamento"
        header={
          detail && (
            <div className="min-w-0 space-y-4">
              {detail.uid ? (
                <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.12] via-white/[0.03] to-transparent px-4 py-3.5">
                  {payerLoading && (
                    <p className="text-base font-semibold text-slate-400">A carregar utilizador…</p>
                  )}
                  {!payerLoading && payerProfile && (
                    <>
                      <p className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                        {payerProfile.nickname}
                        <span className="font-semibold text-slate-500">#{payerProfile.tag}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                        <AdminEloBadge elo={payerProfile.elo} iconClass="h-5 w-5" />
                        <span className="hidden text-slate-600 sm:inline" aria-hidden>
                          ·
                        </span>
                        <AdminRegionInline region={payerProfile.region} />
                        {payerProfile.profileSlug && (
                          <>
                            <span className="text-slate-600">·</span>
                            <Link
                              to={`/u/${encodeURIComponent(payerProfile.profileSlug)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              @{payerProfile.profileSlug}
                              <ExternalLink className="h-3 w-3 opacity-70" />
                            </Link>
                          </>
                        )}
                      </div>
                      {payerProfile.roles?.length ? (
                        <div className="mt-2 border-t border-white/5 pt-2">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Rotas
                          </p>
                          <AdminRolesStrip roles={payerProfile.roles} />
                        </div>
                      ) : null}
                    </>
                  )}
                  {!payerLoading && !payerProfile && (
                    <p className="text-base font-semibold text-amber-200/95">
                      Sem documento em <span className="font-mono text-sm">users</span> para este UID
                    </p>
                  )}
                  <p className="mt-2 break-all font-mono text-[10px] leading-relaxed text-slate-500">
                    {detail.uid}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Este webhook não inclui UID.</p>
              )}

              <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Webhook processado
                  </p>
                  <p className="mt-1 font-mono text-sm text-white">{detail.atLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Valor</p>
                  <p className="mt-1 tabular-nums text-lg font-bold text-emerald-300">
                    {(() => {
                      const d = paymentDisplayAmount(detail)
                      return d ? formatBrl(d.brl) : '—'
                    })()}
                  </p>
                  {paymentDisplayAmount(detail)?.isEstimate ? (
                    <p className="mt-0.5 text-[10px] text-amber-400/90">Referência catálogo</p>
                  ) : null}
                  {detail.netValue != null &&
                    Number.isFinite(detail.netValue) &&
                    detail.value != null &&
                    Number.isFinite(detail.value) &&
                    detail.netValue !== detail.value && (
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Líquido {formatBrl(detail.netValue)}
                      </p>
                    )}
                  {detail.billingType && (
                    <p className="mt-0.5 font-mono text-[10px] text-slate-500">{detail.billingType}</p>
                  )}
                </div>
                {detail.productRef && (
                  <div className="text-right">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Produto
                    </p>
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {adminProductLabel(detail.productRef)}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-500">{detail.productRef}</p>
                  </div>
                )}
              </div>
            </div>
          )
        }
      >
        {detail && (
          <>
            <AdminModalSection title="Acções">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void copyText(detail.id).then((ok) => ok && flashCopy('pay'))
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-white/15 hover:bg-white/[0.08]"
                >
                  <Copy className="h-3.5 w-3.5 opacity-80" />
                  {copyFlash === 'pay' ? 'Copiado' : 'Copiar payment ID'}
                </button>
                {detail.uid && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        void copyText(detail.uid!).then((ok) => ok && flashCopy('uid'))
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-white/15 hover:bg-white/[0.08]"
                    >
                      <Copy className="h-3.5 w-3.5 opacity-80" />
                      {copyFlash === 'uid' ? 'Copiado' : 'Copiar UID'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDetail(null)
                        navigate(`/admin/users?user=${encodeURIComponent(detail.uid!)}`)
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-primary/35 bg-primary/15 px-3.5 py-2 text-xs font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/25"
                    >
                      <User className="h-3.5 w-3.5" />
                      Ficha do utilizador
                    </button>
                  </>
                )}
              </div>
            </AdminModalSection>

            <AdminModalSection title="Detalhes do registo" className="mt-8">
              <dl className="grid gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-3">
                <div className="sm:col-span-2 sm:min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Payment ID (doc)
                  </dt>
                  <dd className="mt-1 break-all font-mono text-xs text-slate-200">{detail.id}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Processado (ms)
                  </dt>
                  <dd className="mt-1 font-mono text-sm text-slate-100">
                    {detail.processedAtMs || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Valor (bruto)
                  </dt>
                  <dd className="mt-1 tabular-nums text-sm font-semibold text-emerald-300">
                    {(() => {
                      const d = paymentDisplayAmount(detail)
                      return d ? formatBrl(d.brl) : '—'
                    })()}
                    {paymentDisplayAmount(detail)?.isEstimate ? (
                      <span className="mt-1 block text-[10px] font-normal text-amber-400/90">
                        Referência do catálogo (webhook sem valor ou registo antigo)
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Valor líquido
                  </dt>
                  <dd className="mt-1 tabular-nums text-sm text-slate-200">
                    {detail.netValue != null && Number.isFinite(detail.netValue)
                      ? formatBrl(detail.netValue)
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Método (Asaas)
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-slate-300">{detail.billingType ?? '—'}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">UID</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-slate-300">
                    {detail.uid ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Produto (ref)
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-primary">{detail.productRef ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Produto (rótulo)
                  </dt>
                  <dd className="mt-1 text-sm text-slate-200">
                    {detail.productRef ? adminProductLabel(detail.productRef) : '—'}
                  </dd>
                </div>
                <div className="sm:col-span-2 sm:min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Evento Asaas
                  </dt>
                  <dd className="mt-1 break-words text-sm">
                    {detail.event ? (
                      <>
                        <span className="font-medium text-slate-100">
                          {labelAsaasWebhookEventPt(detail.event)}
                        </span>
                        <span className="mt-1 block font-mono text-[10px] text-slate-500">
                          {detail.event}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-200">—</span>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2 sm:min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Event ID
                  </dt>
                  <dd className="mt-1 break-all font-mono text-xs text-slate-300">
                    {detail.eventId ?? '—'}
                  </dd>
                </div>
              </dl>
            </AdminModalSection>

            <p className="mt-8 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-slate-500">
              O valor vem do webhook quando o Asaas envia <span className="font-mono">payment.value</span>; em
              falta, o backend grava o preço de catálogo (marcado «ref.»). Registos antigos sem valor mostram a
              referência do catálogo na UI quando o produto é conhecido.
            </p>
          </>
        )}
      </AdminModal>
    </>
  )
}
