import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { Toaster, toast } from 'sonner'

type ToastApi = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  message: (message: string) => void
  promise: typeof toast.promise
  dismiss: typeof toast.dismiss
}

const ToastContext = createContext<ToastApi | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => toast.success(message),
      error: (message) => toast.error(message),
      info: (message) => toast.info(message),
      message: (message) => toast.message(message),
      promise: toast.promise,
      dismiss: toast.dismiss,
    }),
    [],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster
        theme="dark"
        richColors
        closeButton
        position="top-center"
        toastOptions={{
          classNames: {
            toast:
              'group border border-border bg-card text-slate-100 shadow-lg shadow-black/40',
            title: 'text-sm font-medium text-white',
            description: 'text-xs text-slate-400',
            actionButton:
              'bg-primary text-black font-semibold',
            cancelButton: 'bg-white/10 text-slate-300',
            closeButton:
              'bg-white/5 border-border text-slate-400 hover:bg-white/10 hover:text-white',
          },
        }}
      />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast deve ser usado dentro de ToastProvider')
  }
  return ctx
}

/** Para uso fora de React (ex.: módulos utilitários) — só depois do Toaster montado. */
export { toast }
