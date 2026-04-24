import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useState } from 'react'
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

  const previewLines = useMemo(() => {
    const t2 = Math.max(2, form.tier2MinNth)
    const t3 = Math.max(t2 + 1, form.tier3MinNth)
    const lastLow = t2 - 1
    const lastMid = t3 - 1
    return {
      line1: `Indicações pagas n.º 1 até ${lastLow} → ${form.percentTier1}% do valor do pagamento`,
      line2: `Indicações pagas n.º ${t2} até ${lastMid} → ${form.percentTier2}%`,
      line3: `Indicações pagas n.º ${t3} em diante → ${form.percentTier3}%`,
    }
  }, [form])

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex rounded-lg bg-primary/15 p-2 text-primary">
          <Gift className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-white">Programa “Indique e ganhe”</h2>
          <p className="mt-1 text-sm text-slate-500">
            Cada vez que um indicado paga <strong className="font-medium text-slate-400">Premium</strong>, o
            indicador ganha uma comissão em % sobre esse valor. O número da indicação (1.ª, 2.ª, …)
            é contado só com pagamentos já confirmados.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-2xl space-y-8">
        <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => {
              setDirty(true)
              setForm((f) => ({ ...f, enabled: e.target.checked }))
            }}
            className="h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary"
          />
          <span>Programa activo (se desligar, ninguém recebe comissão nova)</span>
        </label>

        <div
          className="rounded-xl border border-dashed border-primary/35 bg-primary/[0.06] p-4"
          aria-live="polite"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Resumo com os valores actuais
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
            <li>{previewLines.line1}</li>
            <li>{previewLines.line2}</li>
            <li>{previewLines.line3}</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Percentuais por faixa</h3>
          <p className="text-xs text-slate-500">
            Três níveis de comissão. Os números abaixo são sempre o valor em % sobre o pagamento
            Premium (ex.: 5 = 5%).
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="font-medium text-slate-300">Faixa inicial</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">% nas primeiras indicações</span>
              <input
                type="number"
                min={0}
                max={100}
                value={form.percentTier1}
                onChange={(e) => {
                  setDirty(true)
                  setForm((f) => ({ ...f, percentTier1: Number(e.target.value) }))
                }}
                className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-300">Faixa intermédia</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">% no meio do percurso</span>
              <input
                type="number"
                min={0}
                max={100}
                value={form.percentTier2}
                onChange={(e) => {
                  setDirty(true)
                  setForm((f) => ({ ...f, percentTier2: Number(e.target.value) }))
                }}
                className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-300">Faixa máxima</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">% nas indicações mais maduras</span>
              <input
                type="number"
                min={0}
                max={100}
                value={form.percentTier3}
                onChange={(e) => {
                  setDirty(true)
                  setForm((f) => ({ ...f, percentTier3: Number(e.target.value) }))
                }}
                className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-white"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Onde mudam as faixas</h3>
          <p className="text-xs text-slate-500">
            Aqui defines só o <strong className="font-medium text-slate-400">número da indicação paga</strong>{' '}
            em que o % sobe. Ex.: 20 e 50 = igual ao modelo “até 19 / 20–49 / 50+”.
          </p>
          <label className="block max-w-md text-sm">
            <span className="font-medium text-slate-300">
              A partir de qual indicação paga vale a faixa intermédia?
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
              Ex.: 20 → da 20.ª indicação paga em diante usa o % “Faixa intermédia”, até ao limite
              seguinte.
            </span>
            <input
              type="number"
              min={2}
              max={500}
              value={form.tier2MinNth}
              onChange={(e) => {
                setDirty(true)
                setForm((f) => ({ ...f, tier2MinNth: Number(e.target.value) }))
              }}
              className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-white"
            />
          </label>
          <label className="block max-w-md text-sm">
            <span className="font-medium text-slate-300">
              A partir de qual indicação paga vale a faixa máxima?
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
              Tem de ser maior que o campo anterior. Ex.: 50 → da 50.ª indicação paga em diante usa
              o % “Faixa máxima”.
            </span>
            <input
              type="number"
              min={3}
              max={10000}
              value={form.tier3MinNth}
              onChange={(e) => {
                setDirty(true)
                setForm((f) => ({ ...f, tier3MinNth: Number(e.target.value) }))
              }}
              className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-white"
            />
          </label>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white">Limite mensal (opcional)</h3>
          <label className="block max-w-md text-sm">
            <span className="text-slate-400">
              Máximo de comissões contabilizadas por indicador, por mês civil
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-600">
              0 = sem limite (comportamento reservado para uma próxima versão do motor de pagamentos).
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
              className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-white"
            />
          </label>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
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
