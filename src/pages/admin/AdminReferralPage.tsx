import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ReferralConfigPanel } from '../../components/admin/ReferralConfigPanel'
import { adminProductLabel } from '../../lib/adminProductLabels'
import { db } from '../../firebase/config'
import { formatBrl } from '../../lib/formatBrl'
import { useToast } from '../../contexts/ToastContext'

type ReferralRewardRow = {
  id: string
  buyerUid?: string
  referrerUid?: string
  productRef?: string
  paymentId?: string
  valueBrl?: number
  percentApplied?: number
  commissionBrl?: number
  referralNth?: number
  pixKeySnapshot?: string
  payoutStatus?: string
  createdAtMs: number
}

function PayoutCell({ row }: { row: ReferralRewardRow }) {
  const toast = useToast()
  const status = row.payoutStatus ?? 'pending'

  if (status === 'paid') {
    return <span className="text-emerald-400">Pago</span>
  }
  if (status === 'cancelled') {
    return <span className="text-slate-500">Cancelado</span>
  }

  async function markPaid(): Promise<void> {
    if (!db) return
    try {
      await updateDoc(doc(db, 'referral_rewards', row.id), {
        payoutStatus: 'paid',
      })
      toast.success('Marcado como pago.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível actualizar.')
    }
  }

  return (
    <button
      type="button"
      onClick={() => void markPaid()}
      className="rounded-md border border-border bg-white/5 px-2 py-1 text-[10px] font-medium text-primary hover:bg-white/10"
    >
      Marcar pago
    </button>
  )
}

export function AdminReferralPage() {
  const [rows, setRows] = useState<ReferralRewardRow[]>([])
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) return
    const q = query(collection(db, 'referral_rewards'), orderBy('createdAt', 'desc'), limit(40))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setListError(null)
        const next: ReferralRewardRow[] = []
        snap.forEach((d) => {
          const x = d.data() as Record<string, unknown>
          const ca = x.createdAt as { toMillis?: () => number } | undefined
          const createdAtMs = ca && typeof ca.toMillis === 'function' ? ca.toMillis() : 0
          next.push({
            id: d.id,
            buyerUid: typeof x.buyerUid === 'string' ? x.buyerUid : undefined,
            referrerUid: typeof x.referrerUid === 'string' ? x.referrerUid : undefined,
            productRef: typeof x.productRef === 'string' ? x.productRef : undefined,
            paymentId: typeof x.paymentId === 'string' ? x.paymentId : undefined,
            valueBrl: typeof x.valueBrl === 'number' ? x.valueBrl : undefined,
            percentApplied: typeof x.percentApplied === 'number' ? x.percentApplied : undefined,
            commissionBrl: typeof x.commissionBrl === 'number' ? x.commissionBrl : undefined,
            referralNth: typeof x.referralNth === 'number' ? x.referralNth : undefined,
            pixKeySnapshot:
              typeof x.pixKeySnapshot === 'string' ? x.pixKeySnapshot : undefined,
            payoutStatus: typeof x.payoutStatus === 'string' ? x.payoutStatus : undefined,
            createdAtMs,
          })
        })
        setRows(next)
      },
      (err) => {
        setListError(err.message)
        setRows([])
      },
    )
    return () => unsub()
  }, [])

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Helmet>
        <title>Indicações — Admin SemAleatório</title>
      </Helmet>
      <header>
        <h1 className="text-2xl font-bold text-white">Indique e ganhe</h1>
        <p className="mt-1 text-sm text-slate-500">
          Percentuais globais, histórico de comissões e chave PIX registada no momento do
          pagamento. Use “Marcar pago” após transferir por PIX.
        </p>
      </header>

      <ReferralConfigPanel />

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-white">Comissões recentes</h2>
        <p className="mt-1 text-xs text-slate-500">
          Um registo por pagamento Premium do indicado. Valor da comissão = % × valor bruto do
          pagamento.
        </p>
        {listError ? (
          <p className="mt-4 text-sm text-amber-400">{listError}</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Ainda não há comissões registadas.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[900px] text-left text-xs text-slate-300">
              <thead className="border-b border-border bg-bg/60 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Indicador</th>
                  <th className="px-3 py-2">Indicado</th>
                  <th className="px-3 py-2">Plano</th>
                  <th className="px-3 py-2">Nº</th>
                  <th className="px-3 py-2">%</th>
                  <th className="px-3 py-2">Comissão</th>
                  <th className="px-3 py-2">PIX (snapshot)</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Acção</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/80 last:border-0">
                    <td className="px-3 py-2 tabular-nums text-slate-400">
                      {r.createdAtMs
                        ? new Date(r.createdAtMs).toLocaleString('pt-BR')
                        : '—'}
                    </td>
                    <td className="max-w-[100px] truncate px-3 py-2 font-mono text-[10px]">
                      {r.referrerUid ?? '—'}
                    </td>
                    <td className="max-w-[100px] truncate px-3 py-2 font-mono text-[10px]">
                      {r.buyerUid ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      {r.productRef ? adminProductLabel(r.productRef) : '—'}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{r.referralNth ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {typeof r.percentApplied === 'number' ? `${r.percentApplied}%` : '—'}
                    </td>
                    <td className="px-3 py-2 tabular-nums font-medium text-primary">
                      {typeof r.commissionBrl === 'number' ? formatBrl(r.commissionBrl) : '—'}
                    </td>
                    <td className="max-w-[140px] break-all px-3 py-2 font-mono text-[10px] text-slate-400">
                      {r.pixKeySnapshot?.length ? r.pixKeySnapshot : '—'}
                    </td>
                    <td className="px-3 py-2 text-[10px]">{r.payoutStatus ?? 'pending'}</td>
                    <td className="px-3 py-2">
                      <PayoutCell row={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
