import { type FormEvent, useEffect, useState } from 'react'

const MAX_LEN = 120

export type ReferralPixKeyFormProps = {
  /** Valor vindo do perfil (Firestore). */
  initialPixKey: string
  onSave: (trimmed: string) => Promise<void>
  disabled?: boolean
}

/**
 * Formulário para cadastrar a chave PIX onde o utilizador recebe comissões de indicação.
 */
export function ReferralPixKeyForm({
  initialPixKey,
  onSave,
  disabled = false,
}: ReferralPixKeyFormProps) {
  const [value, setValue] = useState(initialPixKey)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(initialPixKey)
  }, [initialPixKey])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const t = value.trim().slice(0, MAX_LEN)
    setSaving(true)
    try {
      await onSave(t)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={(ev) => void handleSubmit(ev)}
      className="mt-4 rounded-xl border border-slate-600/40 bg-bg/40 p-4"
    >
      <p className="text-xs font-medium text-slate-300">Chave PIX para receber comissões</p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
        CPF, e-mail, telefone (+55…), ou chave aleatória. Usada pelo equipamento para pagar as
        comissões de indicação confirmadas.
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX_LEN))}
        placeholder="Ex.: meuemail@dominio.com ou +5511999990000"
        disabled={disabled || saving}
        autoComplete="off"
        className="mt-3 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white placeholder:text-slate-600 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || saving}
        className="mt-3 rounded-lg bg-slate-600 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-500 disabled:opacity-50"
      >
        {saving ? 'A guardar…' : 'Guardar chave PIX'}
      </button>
    </form>
  )
}

export default ReferralPixKeyForm
