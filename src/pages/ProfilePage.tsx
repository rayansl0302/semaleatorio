import { doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useSearchParams } from 'react-router-dom'
import { formatApiBackendError } from '../lib/callableErrors'
import { LolEloIcon, LolRoleIcon } from '../components/LolIcons'
import { RateUserModal } from '../components/RateUserModal'
import { useAuth, persistProfile } from '../contexts/AuthContext'
import { vercelApiCall, vercelApiConfigured } from '../firebase/api'
import { db } from '../firebase/config'
import { PLAYER_TAG_OPTIONS, QUEUE_LABELS, ROLES } from '../lib/constants'
import { isPremiumActive } from '../lib/plan'
import { getPublicSiteUrl } from '../lib/siteUrl'
import { hasSemiAleatorioSeal } from '../lib/seal'
import { formatLastSeenAgo, isRecentlyActive } from '../lib/timeAgoFirestore'
import type { PlayerStatus, QueueType, UserProfile } from '../types/models'

export function ProfilePage() {
  const { user, profile, loading, refreshProfile, updateLocalProfile } = useAuth()
  const [params, setParams] = useSearchParams()
  const viewUid = params.get('u')
  const [viewProfile, setViewProfile] = useState<UserProfile | null>(null)
  const [rateOpen, setRateOpen] = useState(false)
  const [riotOAuthLoading, setRiotOAuthLoading] = useState(false)
  const [riotMsg, setRiotMsg] = useState<string | null>(null)
  const [payLoading, setPayLoading] = useState<string | null>(null)
  const [payMsg, setPayMsg] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState('')

  const isOwn = !viewUid || viewUid === user?.uid
  const display = isOwn ? profile : viewProfile

  useEffect(() => {
    if (!viewUid || !db || viewUid === user?.uid) {
      setViewProfile(null)
      return
    }
    getDoc(doc(db, 'users', viewUid)).then((snap) => {
      if (!snap.exists()) {
        setViewProfile(null)
        return
      }
      const data = snap.data() as UserProfile
      if (data.shadowBanned) {
        setViewProfile(null)
        return
      }
      setViewProfile({ ...data, uid: data.uid ?? viewUid })
    })
  }, [viewUid, user?.uid])

  useEffect(() => {
    const riot = params.get('riot')
    if (!riot) return
    if (riot === 'ok') {
      setRiotMsg('Conta Riot conectada com sucesso.')
      void refreshProfile()
    } else if (riot === 'err') {
      const detail = params.get('detail')
      setRiotMsg(
        detail
          ? decodeURIComponent(detail.replace(/\+/g, ' '))
          : 'Não foi possível conectar à Riot.',
      )
    }
    const next = new URLSearchParams(params)
    next.delete('riot')
    next.delete('detail')
    setParams(next, { replace: true })
  }, [params, setParams, refreshProfile])

  const seal = display && (hasSemiAleatorioSeal(display) || display.semiAleatorio)

  const statsUnlocked = isPremiumActive(profile)

  async function payAsaas(product: 'premium_monthly' | 'boost_1h' | 'boost_3h') {
    if (!vercelApiConfigured() || !user) return
    setPayLoading(product)
    setPayMsg(null)
    try {
      const data = await vercelApiCall<{
        paymentId?: string
        invoiceUrl?: string | null
      }>('createAsaasCheckout', { product })
      if (data?.invoiceUrl) {
        window.open(data.invoiceUrl, '_blank', 'noopener,noreferrer')
        setPayMsg('Abra o link de pagamento na nova aba para concluir.')
      } else {
        setPayMsg('Pagamento iniciado. Verifique seu e-mail se precisar do boleto ou fatura.')
      }
    } catch (e) {
      setPayMsg(
        e instanceof Error ? e.message : 'Erro ao iniciar pagamento. Tente de novo.',
      )
    } finally {
      setPayLoading(null)
    }
  }

  const mockStats = useMemo(
    () => ({
      gamesSuggested: 42,
      duoWinrate: 58,
      streak: 3,
    }),
    [],
  )

  async function copyToClipboard(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey(''), 2200)
    } catch {
      window.prompt('Copie:', value)
    }
  }

  async function saveField<K extends keyof UserProfile>(
    key: K,
    value: UserProfile[K],
  ) {
    if (!user || !isOwn) return
    updateLocalProfile({ [key]: value } as Partial<UserProfile>)
    await persistProfile(user.uid, { [key]: value } as Record<string, unknown>)
  }

  async function startRiotOAuth() {
    if (!user) {
      setRiotMsg('Inicia sessão para ligar a conta Riot.')
      return
    }
    if (!vercelApiConfigured()) {
      setRiotMsg(
        'API não configurada: no .env da raiz define VITE_API_URL (URL do deploy na Vercel, ex.: https://teu-app.vercel.app). Reinicia o Vite.',
      )
      return
    }
    setRiotOAuthLoading(true)
    setRiotMsg(null)
    try {
      const data = await vercelApiCall<{ url?: string }>('prepareRiotOAuth', {})
      const url = data?.url?.trim()
      if (!url) {
        setRiotMsg('Resposta inválida do servidor (sem URL de login).')
        return
      }
      window.location.assign(url)
    } catch (e) {
      setRiotMsg(formatApiBackendError(e))
    } finally {
      setRiotOAuthLoading(false)
    }
  }

  if (loading) {
    return <p className="text-slate-500">Carregando…</p>
  }

  if (!user) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-slate-400">
        <Link
          to="/entrar?redirect=/app/perfil"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Entre
        </Link>{' '}
        com Google ou e-mail para editar seu perfil.
      </p>
    )
  }

  if (!isOwn && !display) {
    return (
      <p className="text-slate-500">
        Perfil não encontrado ou indisponível (moderação).
      </p>
    )
  }

  if (!display) return null

  const statusPublicLabel =
    display.status === 'LFG'
      ? 'LFG · procurando duo/time'
      : display.status === 'PLAYING'
        ? 'Em partida'
        : 'Offline'

  const profileUid = display.uid ?? viewUid ?? ''
  const avatarInitial = (display.nickname?.[0] ?? '?').toUpperCase()
  const seenAgo = formatLastSeenAgo(display.lastOnline)
  const seenLive = isRecentlyActive(display.lastOnline)

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">
      <Helmet>
        <title>
          {`${display.nickname ?? 'Invocador'}#${display.tag ?? 'BR1'}${isOwn ? ' — Meu perfil' : ' — Perfil'} · SemAleatório`}
        </title>
        <meta
          name="description"
          content={`${display.elo ?? 'UNRANKED'} · ${statusPublicLabel} no SemAleatório (BR).`}
        />
      </Helmet>

      {isOwn && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-border/80 bg-card/40 p-2">
          <Link
            to="/app"
            className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
          >
            Feed LFG
          </Link>
          <Link
            to="/app/jogadores"
            className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
          >
            Mural
          </Link>
          <Link
            to="/app/mensagens"
            className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
          >
            Mensagens
          </Link>
        </div>
      )}

      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-[#0d1219] p-6 shadow-xl shadow-black/30 sm:p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
          aria-hidden
        />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-32 w-64 rounded-full bg-secondary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-5">
            <div className="relative shrink-0">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/50 to-primary/20 text-3xl font-black text-white ring-2 ring-primary/30 sm:h-28 sm:w-28">
                {avatarInitial}
              </div>
              {seenLive && (
                <span
                  className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-4 border-card bg-primary"
                  title="Ativo no app recentemente"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Invocador
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {display.nickname}
                <span className="font-normal text-slate-500">#{display.tag}</span>
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-bg/80 px-3 py-1 ring-1 ring-border">
                  <LolEloIcon elo={display.elo} className="h-8 w-8" />
                  <span className="text-base font-semibold text-primary">{display.elo}</span>
                </span>
                {isPremiumActive(display) && (
                  <span className="rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-3 py-1 text-xs font-bold text-black">
                    Premium
                  </span>
                )}
                {seal && (
                  <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/40">
                    SemAleatório ✔
                  </span>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Última atividade no app:{' '}
                <span className={seenLive ? 'font-medium text-primary' : 'text-slate-400'}>
                  {seenLive ? 'agora / há pouco' : seenAgo}
                </span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {!isOwn && (
              <>
                <button
                  type="button"
                  onClick={() => setRateOpen(true)}
                  className="w-full rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-white sm:w-auto"
                >
                  Avaliar
                </button>
                <Link
                  to={`/app/mensagens?com=${encodeURIComponent(profileUid)}`}
                  className="w-full rounded-xl border border-primary/40 bg-primary/10 px-5 py-2.5 text-center text-sm font-semibold text-primary hover:bg-primary/15 sm:w-auto"
                >
                  Enviar mensagem
                </Link>
              </>
            )}
          </div>
        </div>

        {profileUid && (
          <div className="relative mt-6 rounded-xl border border-border bg-bg/60 px-3 py-2.5 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-2 gap-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                UID · colar no chat
              </span>
              <code className="min-w-0 flex-1 truncate text-[11px] text-slate-300 sm:text-xs">
                {profileUid}
              </code>
              <button
                type="button"
                onClick={() => void copyToClipboard('uid', profileUid)}
                className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
              >
                {copiedKey === 'uid' ? 'Copiado' : 'Copiar UID'}
              </button>
            </div>
          </div>
        )}

        {!isOwn && (
          <div className="relative mt-6 space-y-4 border-t border-border pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  display.status === 'LFG'
                    ? 'bg-accent/25 text-amber-100'
                    : display.status === 'PLAYING'
                      ? 'bg-secondary/40 text-white'
                      : 'bg-white/10 text-slate-400'
                }`}
              >
                {statusPublicLabel}
              </span>
              {display.playingNow && (
                <span className="rounded-lg bg-primary/20 px-2 py-1 text-xs font-medium text-primary">
                  Jogando agora
                </span>
              )}
            </div>
            {display.roles && display.roles.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Rotas
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {display.roles.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300"
                    >
                      <LolRoleIcon role={r} className="h-4 w-4" />
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {display.queueTypes && display.queueTypes.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Filas
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {display.queueTypes.map((q) => (
                    <span
                      key={q}
                      className="rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      {QUEUE_LABELS[q] ?? q}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {display.playerTags && display.playerTags.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tags
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {display.playerTags.map((t) => (
                    <span
                      key={t}
                      className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-slate-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {display.bio ? (
              <p className="text-sm leading-relaxed text-slate-400">{display.bio}</p>
            ) : null}
          </div>
        )}

        {isOwn && (
          <div className="relative mt-6 space-y-4 border-t border-border pt-6">
            <h2 className="text-sm font-semibold uppercase text-slate-500">
              Conta Riot
            </h2>
            <p className="text-sm text-slate-400">
              {profile?.riotPuuid
                ? `Conectado: ${profile.nickname ?? '?'}#${profile.tag ?? '?'}`
                : 'Ainda não ligou a conta Riot ao perfil.'}
            </p>
            {!vercelApiConfigured() ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Para o login Riot funcionar, adiciona no <code className="text-[0.65rem]">.env</code>{' '}
                da raiz:{' '}
                <code className="text-[0.65rem]">VITE_API_URL=http://localhost:8787</code> (ou{' '}
                <code className="text-[0.65rem]">VITE_BACKEND_URL</code>){' '}
                (ex.: <code className="text-[0.65rem]">https://teu-projeto.vercel.app</code>) sem
                barra no fim. Reinicia o servidor de desenvolvimento depois de guardar.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={riotOAuthLoading}
                onClick={() => void startRiotOAuth()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {riotOAuthLoading
                  ? 'Abrindo…'
                  : profile?.riotPuuid
                    ? 'Voltar a conectar com a Riot'
                    : 'Conectar com a Riot (login oficial)'}
              </button>
            </div>
            {riotMsg ? (
              <p className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-amber-100">
                {riotMsg}
              </p>
            ) : null}
            <p className="text-xs text-slate-600">
              Ao clicar, o site redireciona para{' '}
              <code className="text-slate-500">auth.riotgames.com</code>. Depois de
              autorizar, voltas ao SemAleatório com nick, tag, PUUID e elo vindos da
              Riot (sem pop-up bloqueado pelo browser).
            </p>
          </div>
        )}

        {isOwn && (
          <>
            <div className="mt-6 space-y-3 border-t border-border pt-6">
              <h2 className="text-sm font-semibold uppercase text-slate-500">
                Status
              </h2>
              <div className="flex flex-wrap gap-2">
                {(['LFG', 'PLAYING', 'OFFLINE'] as PlayerStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void saveField('status', s)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      display.status === s
                        ? 'bg-accent text-black'
                        : 'bg-white/5 text-slate-300'
                    }`}
                  >
                    {s === 'LFG'
                      ? 'LFG'
                      : s === 'PLAYING'
                        ? 'Em partida'
                        : 'Offline'}
                  </button>
                ))}
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={!!display.playingNow}
                  onChange={(e) =>
                    void saveField('playingNow', e.target.checked)
                  }
                  className="rounded border-border text-primary"
                />
                Indicador &quot;joga agora&quot;
              </label>
            </div>

            <div className="mt-6 space-y-3 border-t border-border pt-6">
              <h2 className="text-sm font-semibold uppercase text-slate-500">
                Rotas (até 2)
              </h2>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => {
                  const selected = display.roles?.includes(r)
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        const cur = display.roles ?? []
                        let next = [...cur]
                        if (selected) next = next.filter((x) => x !== r)
                        else if (next.length < 2) next.push(r)
                        void saveField('roles', next)
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                        selected
                          ? 'bg-secondary text-white'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      <LolRoleIcon role={r} className="h-4 w-4" />
                      {r}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 space-y-3 border-t border-border pt-6">
              <h2 className="text-sm font-semibold uppercase text-slate-500">
                Filas que jogo
              </h2>
              <div className="flex flex-wrap gap-2">
                {(['duo', 'flex', 'clash'] as QueueType[]).map((q) => {
                  const selected = display.queueTypes?.includes(q)
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        const cur = display.queueTypes ?? []
                        let next = [...cur]
                        if (selected) next = next.filter((x) => x !== q)
                        else next.push(q)
                        void saveField('queueTypes', next)
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                        selected
                          ? 'bg-primary/20 text-primary'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {QUEUE_LABELS[q]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 space-y-3 border-t border-border pt-6">
              <h2 className="text-sm font-semibold uppercase text-slate-500">
                Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {PLAYER_TAG_OPTIONS.map((t) => {
                  const selected = display.playerTags?.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        const cur = display.playerTags ?? []
                        const next = selected
                          ? cur.filter((x) => x !== t)
                          : [...cur, t]
                        void saveField('playerTags', next)
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs ${
                        selected
                          ? 'bg-white/15 text-white'
                          : 'bg-white/5 text-slate-500'
                      }`}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="mt-6 block border-t border-border pt-6 text-xs text-slate-500">
              Bio curta
              <textarea
                value={display.bio ?? ''}
                onChange={(e) => updateLocalProfile({ bio: e.target.value })}
                onBlur={() => void saveField('bio', display.bio)}
                rows={3}
                maxLength={200}
                className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
              />
            </label>

            <div className="mt-6 rounded-xl border border-primary/25 bg-primary/[0.07] p-5 text-sm">
              <p className="font-semibold text-primary">Perfil público</p>
              <p className="mt-1 text-xs text-slate-500">
                Quem abrir o link pode copiar seu nick e enviar mensagem pelo SemAleatório.
              </p>
              {profile?.profileSlug ? (
                <>
                  <p className="mt-3 break-all rounded-lg bg-bg/50 px-3 py-2 font-mono text-[11px] text-slate-300 ring-1 ring-border">
                    {getPublicSiteUrl()}/u/{profile.profileSlug}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${getPublicSiteUrl()}/u/${profile.profileSlug}`
                        void copyToClipboard('link', url)
                      }}
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-black hover:bg-primary/90"
                    >
                      {copiedKey === 'link' ? 'Link copiado' : 'Copiar link'}
                    </button>
                    <a
                      href={`${getPublicSiteUrl()}/u/${profile.profileSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/5"
                    >
                      Abrir página pública
                    </a>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Preencha e salve nick e tag na seção Riot acima para gerar o endereço
                  público em <span className="font-mono text-slate-400">/u/seu-nick</span>
                  .
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {isOwn && (
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">Planos</h2>
          <p className="mt-2 text-sm text-slate-400">
            Premium e boost com PIX, boleto ou cartão — a confirmação atualiza seu
            plano automaticamente após o pagamento.
          </p>
          {payMsg && <p className="mt-2 text-sm text-primary">{payMsg}</p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <p className="font-semibold text-white">Free</p>
              <p className="mt-1 text-xs text-slate-500">R$ 0 — core completo</p>
            </div>
            <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
              <p className="font-semibold text-amber-200">Premium</p>
              <p className="mt-1 text-xs text-slate-500">R$ 29,90 / 30 dias</p>
              <button
                type="button"
                disabled={!vercelApiConfigured() || payLoading !== null}
                onClick={() => void payAsaas('premium_monthly')}
                className="mt-3 w-full rounded-lg bg-accent py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {payLoading === 'premium_monthly' ? 'Gerando…' : 'Pagar'}
              </button>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary">Boost no topo</p>
            <p className="mt-1 text-xs text-slate-500">
              R$ 2,90 (1h) · R$ 5,90 (3h) — somam ao tempo de destaque atual.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!vercelApiConfigured() || payLoading !== null}
                onClick={() => void payAsaas('boost_1h')}
                className="rounded-lg bg-primary/20 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50"
              >
                {payLoading === 'boost_1h' ? '…' : 'Pagar · 1h'}
              </button>
              <button
                type="button"
                disabled={!vercelApiConfigured() || payLoading !== null}
                onClick={() => void payAsaas('boost_3h')}
                className="rounded-lg bg-primary/20 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50"
              >
                {payLoading === 'boost_3h' ? '…' : 'Pagar · 3h'}
              </button>
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-slate-500">Somente desenvolvimento local</p>
            <button
              type="button"
              onClick={async () => {
                if (!user || !db) return
                if (profile?.plan === 'premium') {
                  await updateDoc(doc(db, 'users', user.uid), {
                    plan: 'free',
                    premiumUntil: null,
                  })
                } else {
                  await updateDoc(doc(db, 'users', user.uid), {
                    plan: 'premium',
                    premiumUntil: Timestamp.fromMillis(
                      Date.now() + 30 * 86400000,
                    ),
                  })
                }
                await refreshProfile()
              }}
              className="mt-2 text-xs text-slate-500 underline hover:text-slate-300"
            >
              Simular premium / downgrade (dev)
            </button>
          </div>
        </div>
      )}

      {isOwn && (
        <div className="rounded-2xl border border-border bg-card/80 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">
            Estatísticas detalhadas
            {!statsUnlocked && (
              <span className="ml-2 text-xs font-normal text-accent">
                (Premium)
              </span>
            )}
          </h2>
          {statsUnlocked ? (
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>Sugestões de duo: {mockStats.gamesSuggested}</li>
              <li>Winrate estimado (mock): {mockStats.duoWinrate}%</li>
              <li>Sequência positiva (mock): {mockStats.streak}</li>
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Disponível no Premium — aqui entrariam dados agregados da sua
              conta e do histórico na plataforma.
            </p>
          )}
        </div>
      )}

      <RateUserModal
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        target={!isOwn ? display : null}
        fromUid={user.uid}
      />
    </div>
  )
}
