import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CreditCard, Users } from '../../lib/icons'
import { db } from '../../firebase/config'
import { adminProductLabel } from '../../lib/adminProductLabels'
import { normalizeUserFromFirestore } from '../../lib/firestoreUserProfile'
import { isPremiumActive, premiumVariantOf } from '../../lib/plan'
import type { UserProfile } from '../../types/models'

const PIE_COLORS = ['#64748b', '#22d3ee', '#fbbf24', '#34d399']

const CHART_AXIS = { fill: '#94a3b8', fontSize: 11 }
const CHART_GRID = { stroke: '#1e293b', strokeDasharray: '4 4' }

function AdminTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: ReadonlyArray<{
    name?: string
    value?: number | string
    color?: string
    payload?: { name?: string; total?: number }
  }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]
  const datum = row.payload as { name?: string; total?: number; value?: number } | undefined
  const title =
    datum?.name ??
    row.name ??
    (typeof label === 'string' || typeof label === 'number' ? String(label) : '—')
  const val = row.value ?? datum?.total ?? datum?.value
  return (
    <div className="rounded-lg border border-slate-600/80 bg-[#0f172a] px-3 py-2.5 text-xs shadow-2xl ring-1 ring-black/50">
      <p className="font-medium text-slate-100">{title}</p>
      <p
        className="mt-1 tabular-nums font-semibold"
        style={{ color: row.color ?? '#22c55e' }}
      >
        {typeof val === 'number' ? `Total: ${val}` : String(val ?? '')}
      </p>
    </div>
  )
}

type WebhookRow = {
  id: string
  uid?: string
  productRef?: string
  processedAtMs: number
}

function userSegment(p: UserProfile): 'pro' | 'essential' | 'boost' | 'free' {
  if (isPremiumActive(p) && premiumVariantOf(p) === 'complete') return 'pro'
  if (isPremiumActive(p)) return 'essential'
  const b = p.boostUntil
  if (b && typeof b.toMillis === 'function' && b.toMillis() > Date.now()) return 'boost'
  return 'free'
}

/** Evita ResponsiveContainer (largura/altura -1 em alguns layouts) e animações (refs + React 19). */
function useChartBoxSize() {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 400, h: 280 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize({
        w: Math.max(120, Math.floor(r.width)),
        h: Math.max(120, Math.floor(r.height)),
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { ref, width: size.w, height: size.h }
}

export function AdminDashboardPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [events, setEvents] = useState<WebhookRow[]>([])
  const [usersErr, setUsersErr] = useState<string | null>(null)
  const [payErr, setPayErr] = useState<string | null>(null)

  useEffect(() => {
    if (!db) return
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list: UserProfile[] = []
        snap.forEach((d) => {
          const p = normalizeUserFromFirestore(d.data(), d.id)
          if (p && !p.shadowBanned) list.push(p)
        })
        setUsers(list)
        setUsersErr(null)
      },
      (e) => setUsersErr(e.message),
    )
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!db) return
    const q = query(
      collection(db, 'webhook_events'),
      orderBy('processedAt', 'desc'),
      limit(250),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: WebhookRow[] = []
        snap.forEach((d) => {
          const x = d.data() as {
            uid?: string
            productRef?: string
            processedAt?: { toMillis?: () => number }
          }
          const processedAtMs = x.processedAt?.toMillis?.() ?? 0
          rows.push({
            id: d.id,
            uid: x.uid,
            productRef: x.productRef,
            processedAtMs,
          })
        })
        setEvents(rows)
        setPayErr(null)
      },
      (e) => setPayErr(e.message),
    )
    return () => unsub()
  }, [])

  const pieData = useMemo(() => {
    let pro = 0
    let essential = 0
    let boost = 0
    let free = 0
    for (const p of users) {
      const s = userSegment(p)
      if (s === 'pro') pro++
      else if (s === 'essential') essential++
      else if (s === 'boost') boost++
      else free++
    }
    return [
      { name: 'Grátis', value: free },
      { name: 'Destaque', value: boost },
      { name: 'Premium', value: essential },
      { name: 'Premium Pro', value: pro },
    ]
      .filter((x) => x.value > 0)
      .map((x, i) => ({ ...x, fill: PIE_COLORS[i % PIE_COLORS.length] }))
  }, [users])

  const barByDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of events) {
      if (!e.processedAtMs) continue
      const d = new Date(e.processedAtMs)
      const key = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      })
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return [...map.entries()]
      .map(([name, total]) => ({ name, total }))
      .slice(0, 14)
      .reverse()
  }, [events])

  const byProduct = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of events) {
      const k = e.productRef ?? '?'
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    return [...map.entries()]
      .map(([productRef, total]) => ({
        name: adminProductLabel(productRef),
        total,
        productRef,
      }))
      .sort((a, b) => b.total - a.total)
  }, [events])

  const pieBox = useChartBoxSize()
  const productBox = useChartBoxSize()
  const dayBox = useChartBoxSize()

  const productChartHeight = Math.max(200, byProduct.length * 44 + 48)

  return (
    <>
      <Helmet>
        <title>Admin · Visão geral · SemAleatório</title>
      </Helmet>
      <h1 className="text-2xl font-bold text-white">Visão geral</h1>
      <p className="mt-1 text-sm text-slate-500">
        Utilizadores visíveis e histórico recente de webhooks de pagamento.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 lg:col-span-1">
          <Users
            className="pointer-events-none absolute -right-2 -top-2 h-24 w-24 text-primary/10"
            aria-hidden
          />
          <p className="text-xs font-semibold uppercase text-slate-500">Total de perfis</p>
          <p className="mt-2 text-3xl font-bold text-white">{users.length}</p>
          {usersErr && (
            <p className="mt-2 text-xs text-red-400">Utilizadores: {usersErr}</p>
          )}
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 lg:col-span-1">
          <CreditCard
            className="pointer-events-none absolute -right-2 -top-2 h-24 w-24 text-cyan-500/10"
            aria-hidden
          />
          <p className="text-xs font-semibold uppercase text-slate-500">Pagamentos (últimos registos)</p>
          <p className="mt-2 text-3xl font-bold text-white">{events.length}</p>
          {payErr && (
            <p className="mt-2 text-xs text-red-400">Pagamentos: {payErr}</p>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-white">Utilizadores por segmento</h2>
          <div
            ref={pieBox.ref}
            className="mt-4 h-72 min-h-72 min-w-0 rounded-lg bg-[#0b0f14] p-2 ring-1 ring-border/60"
          >
            {pieData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-slate-500">
                Sem dados.
              </p>
            ) : (
              <PieChart
                width={pieBox.width}
                height={pieBox.height}
                margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={72}
                  paddingAngle={2}
                  stroke="#0b0f14"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Tooltip content={<AdminTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 12 }}
                  formatter={(value) => (
                    <span className="text-xs text-slate-400">{String(value)}</span>
                  )}
                />
              </PieChart>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-white">Pagamentos por produto</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Contagem por tipo de cobrança (webhook)</p>
          <div
            ref={productBox.ref}
            className="mt-3 min-w-0 rounded-lg bg-[#0b0f14] p-3 pt-6 ring-1 ring-border/60"
            style={{ height: productChartHeight }}
          >
            {byProduct.length === 0 ? (
              <p className="flex h-40 items-center justify-center text-sm text-slate-500">
                Sem webhooks ainda.
              </p>
            ) : (
              <BarChart
                width={productBox.width}
                height={productBox.height}
                data={byProduct}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
                barCategoryGap={28}
              >
                <CartesianGrid {...CHART_GRID} horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  domain={[0, (dataMax: number) => Math.max(1, Math.ceil(dataMax))]}
                  tick={CHART_AXIS}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={148}
                  tick={CHART_AXIS}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                />
                <Tooltip content={<AdminTooltip />} cursor={{ fill: 'rgba(34,197,94,0.06)' }} />
                <Bar
                  dataKey="total"
                  fill="#22c55e"
                  maxBarSize={26}
                  radius={[0, 6, 6, 0]}
                  name="Pagamentos"
                  isAnimationActive={false}
                />
              </BarChart>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-white">Volume de webhooks por dia</h2>
        <div
          ref={dayBox.ref}
          className="mt-4 h-80 min-h-80 min-w-0 rounded-lg bg-[#0b0f14] p-3 ring-1 ring-border/60"
        >
          {barByDay.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-slate-500">
              Sem dados temporais.
            </p>
          ) : (
            <BarChart
              width={dayBox.width}
              height={dayBox.height}
              data={barByDay}
              margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
              barCategoryGap="18%"
            >
              <CartesianGrid {...CHART_GRID} vertical={false} />
              <XAxis
                dataKey="name"
                tick={CHART_AXIS}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                interval={0}
                angle={-28}
                textAnchor="end"
                height={56}
              />
              <YAxis
                allowDecimals={false}
                tick={CHART_AXIS}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                width={36}
              />
              <Tooltip content={<AdminTooltip />} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
              <Bar
                dataKey="total"
                fill="#3b82f6"
                maxBarSize={40}
                radius={[6, 6, 0, 0]}
                name="Webhooks"
                isAnimationActive={false}
              />
            </BarChart>
          )}
        </div>
      </div>
    </>
  )
}
