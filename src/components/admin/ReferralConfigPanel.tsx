import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { Gift } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../firebase/config'
import { useToast } from '../../contexts/ToastContext'

export type ReferralProgramUiConfig = {
  enabled: boolean
  percentTier1: number
  percentTier2: number
  percentTier3: number
  tier2MinNth: number
  tier3MinNth: number
  maxRewardsPerReferrerPerMonth: number
}

const DEFAULTS: ReferralProgramUiConfig = {
  enabled: true,
  percentTier1: 5,
  percentTier2: 10,
  percentTier3: 20,
  tier2MinNth: 20,
  tier3MinNth: 50,
  maxRewardsPerReferrerPerMonth: 0,
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.floor(n)))
}

function parseRemote(d: Record<string, unknown>): ReferralProgramUiConfig {
  const t2 = clampInt(
    typeof d.tier2MinNth === 'number' ? d.tier2MinNth : DEFAULTS.tier2MinNth,
    2,
    500,
  )
  let t3 = clampInt(
    typeof d.tier3MinNth === 'number' ? d.tier3MinNth : DEFAULTS.tier3MinNth,
    3,
    10_000,
  )
  if (t3 <= t2) t3 = t2 + 1
  return {
    enabled: typeof d.enabled === 'boolean' ? d.enabled : DEFAULTS.enabled,
    percentTier1: clampInt(
      typeof d.percentTier1 === 'number' ? d.percentTier1 : DEFAULTS.percentTier1,
      0,
      100,
    ),
    percentTier2: clampInt(
      typeof d.percentTier2 === 'number' ? d.percentTier2 : DEFAULTS.percentTier2,
      0,
      100,
    ),
    percentTier3: clampInt(
      typeof d.percentTier3 === 'number' ? d.percentTier3 : DEFAULTS.percentTier3,
      0,
      100,
    ),
    tier2MinNth: t2,
    tier3MinNth: t3,
    maxRewardsPerReferrerPerMonth: clampInt(
      typeof d.maxRewardsPerReferrerPerMonth === 'number'
        ? d.maxRewardsPerReferrerPerMonth
        : DEFAULTS.maxRewardsPerReferrerPerMonth,
      0,
      500,
    ),
  }
}

/**
 * Formulário de gestão do programa de indicações (`config/referral`), para o painel admin.
 */
export function ReferralConfigPanel() {
  const { user } = useAuth()
  const toast = useToast()
  const [remote, setRemote] = useState<ReferralProgramUiConfig>(DEFAULTS)
  const [form, setForm] = useState<ReferralProgramUiConfig>(DEFAULTS)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!db) return
    const ref = doc(db, 'config', 'referral')
    return onSnapshot(ref, (snap) => {
      const d = (snap.data() ?? {}) as Record<string, unknown>
      setRemote(parseRemote(d))
    })
  }, [])

  useEffect(() => {
    if (!dirty) {
      setForm(remote)
    }
  }, [remote, dirty])

  const save = useCallback(async () => {
    if (!db || !user) return
    if (form.tier3MinNth <= form.tier2MinNth) {
      toast.error('A 3ª faixa tem de começar depois da 2ª (ex.: 20 e 50).')
      return
    }
    setSaving(true)
    try {
      const payload = {
        enabled: form.enabled,
        percentTier1: clampInt(form.percentTier1, 0, 100),
        percentTier2: clampInt(form.percentTier2, 0, 100),
        percentTier3: clampInt(form.percentTier3, 0, 100),
        tier2MinNth: clampInt(form.tier2MinNth, 2, 500),
        tier3MinNth: clampInt(form.tier3MinNth, 3, 10_000),
        maxRewardsPerReferrerPerMonth: clampInt(form.maxRewardsPerReferrerPerMonth, 0, 500),
      }
      await setDoc(doc(db, 'config', 'referral'), payload, { merge: true })
      setDirty(false)
      toast.success('Configuração de indicações guardada.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível guardar.')
    } finally {
      setSaving(false)
    }
  }, [db, user, form, toast])

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex rounded-lg bg-primary/15 p-2 text-primary">
          <Gift className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-white">Programa “Indique e ganhe”</h2>
          <p className="mt-1 text-sm text-slate-500">
            Percentual sobre o valor pago (Premium Essencial ou Pro). O webhook grava a comissão e
            a chave PIX copiada do indicador no momento do pagamento.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-300 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => {
              setDirty(true)
              setForm((f) => ({ ...f, enabled: e.target.checked }))
            }}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          Programa activo
        </label>

        <label className="block text-sm">
          <span className="text-slate-400">% 1.ª faixa (ex.: indicações 1–19)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={form.percentTier1}
            onChange={(e) => {
              setDirty(true)
              setForm((f) => ({ ...f, percentTier1: Number(e.target.value) }))
            }}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">% 2.ª faixa</span>
          <input
            type="number"
            min={0}
            max={100}
            value={form.percentTier2}
            onChange={(e) => {
              setDirty(true)
              setForm((f) => ({ ...f, percentTier2: Number(e.target.value) }))
            }}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">% 3.ª faixa</span>
          <input
            type="number"
            min={0}
            max={100}
            value={form.percentTier3}
            onChange={(e) => {
              setDirty(true)
              setForm((f) => ({ ...f, percentTier3: Number(e.target.value) }))
            }}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-white"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-400">A partir da N-ésima indicação paga: 2.ª %</span>
          <input
            type="number"
            min={2}
            max={500}
            value={form.tier2MinNth}
            onChange={(e) => {
              setDirty(true)
              setForm((f) => ({ ...f, tier2MinNth: Number(e.target.value) }))
            }}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">A partir da N-ésima: 3.ª %</span>
          <input
            type="number"
            min={3}
            max={10000}
            value={form.tier3MinNth}
            onChange={(e) => {
              setDirty(true)
              setForm((f) => ({ ...f, tier3MinNth: Number(e.target.value) }))
            }}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-white"
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="text-slate-400">
            Máx. comissões por indicador / mês (0 = ilimitado — reservado)
          </span>
          <input
            type="number"
            min={0}
            max={500}
            value={form.maxRewardsPerReferrerPerMonth}
            onChange={(e) => {
              setDirty(true)
              setForm((f) => ({ ...f, maxRewardsPerReferrerPerMonth: Number(e.target.value) }))
            }}
            className="mt-1 w-full max-w-xs rounded-lg border border-border bg-bg px-3 py-2 text-white"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={() => void save()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-black hover:bg-primary/90 disabled:opacity-40"
        >
          {saving ? 'A guardar…' : 'Guardar alterações'}
        </button>
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={() => {
            setForm(remote)
            setDirty(false)
          }}
          className="rounded-lg border border-border px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-40"
        >
          Repor do servidor
        </button>
      </div>
    </section>
  )
}
