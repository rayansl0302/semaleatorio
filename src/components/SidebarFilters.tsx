import { useMemo, useId } from 'react'
import { LolIconSelect } from './LolIconSelect'
import { ELO_ORDER, QUEUE_LABELS, ROLES } from '../lib/constants'
import type { QueueType } from '../types/models'

export type FilterState = {
  eloMin: string
  eloMax: string
  role: string
  statusLfgOnly: boolean
  queueType: QueueType | ''
  search: string
}

type Props = {
  value: FilterState
  onChange: (v: FilterState) => void
  advanced: boolean
  onToggleAdvanced?: () => void
  premiumOnlyAdvanced?: boolean
}

const defaultFilter: FilterState = {
  eloMin: 'ANY',
  eloMax: 'ANY',
  role: 'ANY',
  statusLfgOnly: false,
  queueType: '',
  search: '',
}

export { defaultFilter }

export function SidebarFilters({
  value,
  onChange,
  advanced,
  onToggleAdvanced,
  premiumOnlyAdvanced,
}: Props) {
  const patch = (partial: Partial<FilterState>) => onChange({ ...value, ...partial })

  const roleLabelId = useId()
  const eloMinLabelId = useId()
  const eloMaxLabelId = useId()

  const roleOptions = useMemo(
    () => [
      { value: 'ANY', label: 'Qualquer' },
      ...ROLES.map((r) => ({ value: r, label: r })),
    ],
    [],
  )

  const eloOptions = useMemo(
    () => [
      { value: 'ANY', label: 'Qualquer' },
      ...ELO_ORDER.filter((e) => e !== 'UNRANKED').map((e) => ({
        value: e,
        label: e,
      })),
    ],
    [],
  )

  return (
    <aside className="flex w-full flex-col gap-4 rounded-xl border border-border bg-card p-4 lg:max-w-[280px] lg:shrink-0">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Filtros
      </h2>

      <label className="block text-xs text-slate-500">
        Busca rápida
        <input
          type="search"
          value={value.search}
          onChange={(e) => patch({ search: e.target.value })}
          placeholder="Nick ou #tag"
          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white placeholder:text-slate-600"
        />
      </label>

      <div className="space-y-1.5">
        <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={value.statusLfgOnly}
            onChange={(e) => patch({ statusLfgOnly: e.target.checked })}
            className="mt-0.5 rounded border-border text-primary focus:ring-primary"
          />
          <span>
            <span className="font-medium">Só quem está LFG</span>
          </span>
        </label>
        <p className="pl-7 text-[11px] leading-snug text-slate-500">
          <abbr title="Looking for group" className="cursor-help no-underline">
            LFG
          </abbr>{' '}
          vem do inglês <em>looking for group</em>: jogador que está{' '}
          <strong className="font-medium text-slate-400">procurando time ou parceiro</strong> para
          subir fila agora (duo, flex, Clash etc.).
        </p>
      </div>

      <div>
        <p className="mb-1 text-xs text-slate-500">Tipo de fila</p>
        <div className="flex flex-wrap gap-2">
          {(['duo', 'flex', 'clash'] as const).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => patch({ queueType: value.queueType === q ? '' : q })}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                value.queueType === q
                  ? 'bg-accent text-black'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {QUEUE_LABELS[q]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p id={roleLabelId} className="mb-1 text-xs text-slate-500">
          Rota
        </p>
        <LolIconSelect
          kind="role"
          value={value.role}
          onChange={(v) => patch({ role: v })}
          options={roleOptions}
          aria-labelledby={roleLabelId}
        />
      </div>

      {premiumOnlyAdvanced && !advanced ? (
        <p className="rounded-lg bg-secondary/10 p-2 text-xs text-blue-200">
          Elo <span className="font-semibold text-white">máximo</span> na faixa é{' '}
          <span className="font-semibold text-accent">Premium</span>. Preview abaixo
          só para testar a UI.
        </p>
      ) : null}

      <div>
        <p id={eloMinLabelId} className="mb-1 text-xs text-slate-500">
          Elo mínimo
        </p>
        <LolIconSelect
          kind="elo"
          value={value.eloMin}
          onChange={(v) => patch({ eloMin: v })}
          options={eloOptions}
          aria-labelledby={eloMinLabelId}
        />
      </div>

      <div
        className={
          premiumOnlyAdvanced && !advanced ? 'pointer-events-none opacity-40' : ''
        }
      >
        {(advanced || !premiumOnlyAdvanced) && (
          <>
            <p id={eloMaxLabelId} className="mb-1 text-xs text-slate-500">
              Elo máximo
            </p>
            <LolIconSelect
              kind="elo"
              value={value.eloMax}
              onChange={(v) => patch({ eloMax: v })}
              options={eloOptions}
              aria-labelledby={eloMaxLabelId}
            />
          </>
        )}
      </div>

      {onToggleAdvanced && (
        <button
          type="button"
          onClick={onToggleAdvanced}
          className="text-left text-xs font-medium text-secondary hover:underline"
        >
          {advanced ? 'Ocultar filtros avançados' : 'Filtros avançados (Premium)'}
        </button>
      )}
    </aside>
  )
}
