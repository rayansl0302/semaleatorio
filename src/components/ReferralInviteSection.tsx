export type ReferralInviteSectionProps = {
  /** Slug público (ex.: `faker-br1`) para montar o link de indicação. */
  profileSlug: string
  /** Origem canónica do site, sem barra final (ex. `getPublicSiteUrl()`). */
  siteBaseUrl: string
  /** Se definido, o utilizador já entrou por um link de indicação. */
  referredByUid?: string
  /** Indicações premium já contabilizadas (para texto de patamares). */
  paidReferralCount?: number
  copiedKey: string
  onCopy: (key: string, value: string) => void | Promise<void>
}

/**
 * Bloco “Indique e ganhe”: link para registo com `?ref=` e regras (só planos Premium pagos).
 */
export function ReferralInviteSection({
  profileSlug,
  siteBaseUrl,
  referredByUid,
  paidReferralCount = 0,
  copiedKey,
  onCopy,
}: ReferralInviteSectionProps) {
  const base = siteBaseUrl.replace(/\/$/, '')
  const inviteUrl = `${base}/entrar?ref=${encodeURIComponent(profileSlug)}`

  return (
    <div className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5 text-sm">
      <p className="font-semibold text-emerald-300">Indique e ganhe</p>
      <p className="mt-1 text-xs text-slate-500">
        Comissão em <strong className="text-slate-400">% do valor pago</strong> quando alguém
        assina <strong className="text-slate-400">Premium Essencial</strong> ou{' '}
        <strong className="text-slate-400">Premium Pro</strong> pelo teu link. Por defeito:{' '}
        <strong className="text-slate-400">5%</strong> até à 19ª indicação paga;{' '}
        <strong className="text-slate-400">10%</strong> da 20ª à 49ª;{' '}
        <strong className="text-slate-400">20%</strong> a partir da 50ª (patamares editáveis no
        admin). Regista a tua <strong className="text-slate-400">chave PIX</strong> abaixo para
        pagarmos a comissão. Boost não entra no programa.
      </p>
      <p className="mt-2 text-[11px] text-slate-600">
        Indicações pagas contabilizadas:{' '}
        <span className="tabular-nums text-slate-400">{paidReferralCount}</span>
      </p>
      {referredByUid ? (
        <p className="mt-3 text-xs text-slate-400">
          Este perfil já está associado a uma indicação. Obrigado por usares o convite.
        </p>
      ) : null}
      <p className="mt-3 break-all rounded-lg bg-bg/50 px-3 py-2 font-mono text-[11px] text-slate-300 ring-1 ring-border">
        {inviteUrl}
      </p>
      <button
        type="button"
        onClick={() => void onCopy('invite', inviteUrl)}
        className="mt-3 rounded-lg bg-emerald-500/90 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-400"
      >
        {copiedKey === 'invite' ? 'Link copiado' : 'Copiar link de indicação'}
      </button>
    </div>
  )
}

export default ReferralInviteSection
