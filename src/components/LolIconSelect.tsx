import { useEffect, useId, useRef, useState } from 'react'
import { eloIconSrc } from '../lib/lolAssets'
import { LolEloIcon, LolRoleIcon } from './LolIcons'

export type LolIconSelectOption = { value: string; label: string }

type Props = {
  value: string
  onChange: (v: string) => void
  options: LolIconSelectOption[]
  kind: 'role' | 'elo'
  'aria-labelledby'?: string
  className?: string
}

function OptionIcon({
  kind,
  value,
}: {
  kind: 'role' | 'elo'
  value: string
}) {
  if (value === 'ANY') {
    return (
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-dashed border-slate-600 text-[10px] text-slate-500"
        aria-hidden
      >
        —
      </span>
    )
  }
  if (kind === 'role') {
    return <LolRoleIcon role={value} className="h-7 w-7" />
  }
  if (!eloIconSrc(value)) {
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white/5 text-[10px] font-semibold text-slate-500"
        title="Sem ícone"
        aria-hidden
      >
        {value.slice(0, 2)}
      </span>
    )
  }
  return <LolEloIcon elo={value} className="h-7 w-7" />
}

export function LolIconSelect({
  value,
  onChange,
  options,
  kind,
  'aria-labelledby': ariaLabelledby,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-labelledby={ariaLabelledby}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-left text-sm text-white outline-none ring-primary/40 focus-visible:ring-2"
      >
        <OptionIcon kind={kind} value={value} />
        <span className="min-w-0 flex-1 truncate">{selected.label}</span>
        <span className="shrink-0 text-xs text-slate-500" aria-hidden>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card py-1 shadow-xl"
        >
          {options.map((opt) => {
            const sel = value === opt.value
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={sel}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                    sel ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'
                  }`}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  <OptionIcon kind={kind} value={opt.value} />
                  <span className="truncate">{opt.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
