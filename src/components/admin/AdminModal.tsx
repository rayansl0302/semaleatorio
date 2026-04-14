import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

type AdminModalProps = {
  open: boolean
  onClose: () => void
  /** Conteúdo da faixa superior (título, meta). O botão fechar fica à direita. */
  header: ReactNode
  children: ReactNode
  /** Largura máxima do painel */
  size?: 'md' | 'lg'
  /** id para aria-labelledby se o header tiver título visível */
  ariaLabel?: string
}

export function AdminModal({
  open,
  onClose,
  header,
  children,
  size = 'lg',
  ariaLabel = 'Modal',
}: AdminModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const maxW = size === 'lg' ? 'max-w-2xl' : 'max-w-lg'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[min(92vh,56rem)] w-full ${maxW} flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c1017] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_28px_80px_-16px_rgba(0,0,0,0.85)]`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-white/10 px-5 py-4">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.14] via-transparent to-cyan-500/[0.06]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">{header}</div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-2 text-slate-400 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white hover:ring-white/20"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#080b10] px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}

/** Secção com título dentro do modal */
export function AdminModalSection({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      <h3 className="mb-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
        <span
          className="h-px min-w-8 flex-1 bg-gradient-to-r from-transparent via-primary/45 to-primary/10"
          aria-hidden
        />
        {title}
        <span
          className="h-px min-w-8 flex-1 bg-gradient-to-l from-transparent via-white/20 to-white/5"
          aria-hidden
        />
      </h3>
      {children}
    </section>
  )
}
