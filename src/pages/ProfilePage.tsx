import {
  collection,
  getDoc,
  onSnapshot,
  query,
  Timestamp,
  where,
} from 'firebase/firestore'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useSearchParams } from 'react-router-dom'
import { LolEloIcon, LolRoleIcon } from '../components/LolIcons'
import { RateUserModal } from '../components/RateUserModal'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { db } from '../firebase/config'
import {
  ELO_ORDER,
  PLAYER_TAG_OPTIONS,
  QUEUE_LABELS,
  ROLES,
  STATUS_LABELS,
  eloTierLabel,
  formatEloDisplay,
  playerTagLabel,
  roleLabel,
} from '../lib/constants'
import { extendBoostUntil } from '../lib/boost'
import {
  BOOST_1H_MS,
  BOOST_2H_MS,
  formatBrlFromCents,
  PREMIUM_SUBSCRIPTION_DAYS,
  PRICE_BOOST_1H_CENTS,
  PRICE_BOOST_2H_CENTS,
  PRICE_PREMIUM_COMPLETE_CENTS,
  PRICE_PREMIUM_ESSENTIAL_CENTS,
  PRODUCT_REF,
} from '../lib/pricing'
import {
  getAsaasPaymentLinkUrl,
  hasAsaasPaymentLinksConfigured,
} from '../lib/asaasPaymentLinks'
import { isClientPaymentSandbox } from '../lib/asaasPublic'
import {
  hasPremiumCompleteFeatures,
  isPremiumActive,
  premiumVariantOf,
} from '../lib/plan'
import { profileSlugFromNick } from '../lib/profileSlug'
import {
  normalizeUserFromFirestore,
  userProfileDoc,
} from '../lib/firestoreUserProfile'
import {
  aggregateFromOverallValues,
  mergeRatingIntoProfile,
  type RatingAgg,
} from '../lib/ratingsFirestore'
import { getPublicSiteUrl } from '../lib/siteUrl'
import { hasSemiAleatorioSeal } from '../lib/seal'
import { formatLastSeenAgo, isRecentlyActive } from '../lib/timeAgoFirestore'
import type { PlayerStatus, QueueType, UserProfile } from '../types/models'

function eloTierForSelect(elo: string | undefined): (typeof ELO_ORDER)[number] {
  const tier =
    (elo ?? 'UNRANKED').trim().split(/\s+/)[0]?.toUpperCase() ?? 'UNRANKED'
  return (ELO_ORDER as readonly string[]).includes(tier)
    ? (tier as (typeof ELO_ORDER)[number])
    : 'UNRANKED'
}

type ProfileEditForm = {
  elo: string
  status: PlayerStatus
  playingNow: boolean
  roles: string[]
  queueTypes: QueueType[]
  playerTags: string[]
  bio: string
}

function profileToForm(p: UserProfile): ProfileEditForm {
  return {
    elo: p.elo ?? 'UNRANKED',
    status: p.status ?? 'LFG',
    playingNow: !!p.playingNow,
    roles: [...(p.roles ?? [])],
    queueTypes:
      p.queueTypes && p.queueTypes.length > 0
        ? [...p.queueTypes]
        : (['duo', 'flex', 'clash'] as QueueType[]),
    playerTags: [...(p.playerTags ?? [])],
    bio: p.bio ?? '',
  }
}

export function ProfilePage() {
  const { user, profile, loading, refreshProfile, persistProfile } = useAuth()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const viewUid = params.get('u')
  const [viewProfile, setViewProfile] = useState<UserProfile | null>(null)
  const [rateOpen, setRateOpen] = useState(false)
  const [riotNick, setRiotNick] = useState('')
  const [riotTag, setRiotTag] = useState('')
  const [linkRiotLoading, setLinkRiotLoading] = useState(false)
  const [riotMsg, setRiotMsg] = useState<string | null>(null)
  const [ratingAgg, setRatingAgg] = useState<RatingAgg | null>(null)
  const [copiedKey, setCopiedKey] = useState('')
  /** Evita que o useEffect do perfil apague nick/tag Riot enquanto você digita. */
  const riotInputFocusRef = useRef({ nick: false, tag: false })
  const [editForm, setEditForm] = useState<ProfileEditForm | null>(null)
  const [editDirty, setEditDirty] = useState(false)
  const lastEditProfileUid = useRef<string | null>(null)

  const isOwn = !viewUid || viewUid === user?.uid
  const display = isOwn ? profile : viewProfile

  useEffect(() => {
    if (!db || !display?.uid) {
      setRatingAgg(null)
      return
    }
    const q = query(collection(db, 'ratings'), where('toUid', '==', display.uid))
    const unsub = onSnapshot(q, (snap) => {
      const vals: number[] = []
      snap.forEach((d) => {
        const ov = (d.data() as { overall?: number }).overall
        if (typeof ov === 'number') vals.push(ov)
      })
      setRatingAgg(aggregateFromOverallValues(vals))
    })
    return () => unsub()
  }, [display?.uid])

  useEffect(() => {
    if (!viewUid || !db || viewUid === user?.uid) {
      setViewProfile(null)
      return
    }
    getDoc(userProfileDoc(db, viewUid)).then((snap) => {
      if (!snap.exists()) {
        setViewProfile(null)
        return
      }
      const p = normalizeUserFromFirestore(snap.data(), viewUid)
      if (!p || p.shadowBanned) {
        setViewProfile(null)
        return
      }
      setViewProfile(p)
    })
  }, [viewUid, user?.uid])

  useEffect(() => {
    if (!profile || !isOwn) {
      setEditForm(null)
      lastEditProfileUid.current = null
      return
    }
    const id = profile.uid ?? ''
    if (lastEditProfileUid.current === id) return
    lastEditProfileUid.current = id
    setEditForm(profileToForm(profile))
    setEditDirty(false)
  }, [profile?.uid, isOwn])

  useEffect(() => {
    if (!profile) return
    const f = riotInputFocusRef.current
    if (f.nick || f.tag) return
    setRiotNick(profile.nickname ?? '')
    setRiotTag(profile.tag ?? '')
  }, [profile?.uid, profile?.nickname, profile?.tag])

  /** RSO no browser está desativado: limpa query OAuth se existir. */
  useEffect(() => {
    const code = params.get('code')
    const st = params.get('state')
    if (!code || !st) return
    const next = new URLSearchParams(params)
    next.delete('code')
    next.delete('state')
    setParams(next, { replace: true })
    setRiotMsg(
      'Login Riot no navegador (SSO) está desativado. Use a confirmação manual abaixo.',
    )
  }, [params, setParams])

  /** Volta do checkout Asaas: configura `callback.successUrl` no link (ex. `.../app/perfil?pagamento=sucesso`). */
  useEffect(() => {
    const paid = params.get('pagamento')
    if (paid !== 'sucesso' || !isOwn) return
    const next = new URLSearchParams(params)
    next.delete('pagamento')
    setParams(next, { replace: true })
    void refreshProfile().then(() => {
      toast.success(
        'Voltaste do pagamento Asaas. Perfil actualizado — se o plano ainda não apareceu, aguarda uns segundos ou recarrega.',
      )
    })
  }, [params, setParams, isOwn, refreshProfile, toast])

  const displayMerged = display
    ? mergeRatingIntoProfile(display, ratingAgg ?? undefined)
    : null
  const seal =
    displayMerged &&
    (hasSemiAleatorioSeal(displayMerged) || displayMerged.semiAleatorio)

  const statsUnlocked = hasPremiumCompleteFeatures(profile)
  const premiumActive = isPremiumActive(profile)
  const activeVariant = profile ? premiumVariantOf(profile) : null
  const paymentSandbox = isClientPaymentSandbox()

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
      toast.success(
        key === 'link' ? 'Link do perfil copiado.' : 'Copiado para a área de transferência.',
      )
    } catch {
      window.prompt('Copie:', value)
    }
  }

  const form =
    editForm ?? (isOwn && profile ? profileToForm(profile) : null)

  async function saveEditForm() {
    if (!user || !isOwn || !form) return
    try {
      await persistProfile(user.uid, {
        elo: form.elo,
        status: form.status,
        playingNow: form.playingNow,
        roles: form.roles as UserProfile['roles'],
        queueTypes: form.queueTypes,
        playerTags: form.playerTags,
        bio: form.bio,
      })
      setEditDirty(false)
      toast.success('Alterações salvas.')
    } catch (e) {
      console.error('[Perfil] guardar rascunho:', e)
      toast.error(
        e instanceof Error ? e.message : 'Não foi possível salvar. Tente novamente.',
      )
    }
  }

  function discardEditForm() {
    if (!profile) return
    setEditForm(profileToForm(profile))
    setEditDirty(false)
    toast.info('Alterações descartadas.')
  }

  function startCheckout(productRef: string) {
    if (!user) {
      toast.error('Faça login para continuar.')
      return
    }
    const url = getAsaasPaymentLinkUrl(productRef)
    if (!url) {
      toast.error('Pagamento deste plano ainda não está configurado.')
      return
    }
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function confirmRiotId() {
    if (!user) {
      setRiotMsg('Faça login para vincular o Riot ID.')
      return
    }
    const gn = riotNick.trim()
    const tag = riotTag.trim().replace(/^#/, '')
    if (!gn || !tag) {
      setRiotMsg('Preencha o nome de invocador e a tag (ex.: BR1).')
      return
    }
    setLinkRiotLoading(true)
    setRiotMsg(null)
    try {
      if (!db) {
        setRiotMsg('Firestore não está configurado (variáveis VITE_FIREBASE_* no .env).')
        return
      }
      await persistProfile(user.uid, {
        nickname: gn,
        tag,
        profileSlug: profileSlugFromNick(gn, tag),
      })
      await refreshProfile()
      riotInputFocusRef.current = { nick: false, tag: false }
      setRiotMsg(`Nick e tag salvos (${gn}#${tag}).`)
      toast.success('Perfil atualizado.')
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Não foi possível confirmar.'
      setRiotMsg(m)
      toast.error(m)
    } finally {
      setLinkRiotLoading(false)
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
          Faça login
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

  if (isOwn && user && !display) {
    return <p className="text-slate-500">Carregando perfil…</p>
  }

  if (!display) return null

  const statusPublicLabel =
    STATUS_LABELS[display.status ?? 'OFFLINE'] ?? display.status ?? 'Offline'

  const profileUid = display.uid ?? viewUid ?? ''
  const avatarInitial = (display.nickname?.[0] ?? '?').toUpperCase()
  const headerElo = isOwn && form ? form.elo : display.elo
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
          content={`${formatEloDisplay(display.elo)} · ${statusPublicLabel} no SemAleatório (BR).`}
        />
      </Helmet>

      {isOwn && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-border/80 bg-card/40 p-2">
          <Link
            to="/app"
            className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
          >
            Feed · busca de time
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
                  <LolEloIcon elo={headerElo} className="h-8 w-8" />
                  <span className="text-base font-semibold text-primary">
                    {formatEloDisplay(headerElo)}
                  </span>
                </span>
                {isPremiumActive(display) && (
                  <span
                    className={
                      premiumVariantOf(display) === 'essential'
                        ? 'rounded-full bg-gradient-to-r from-slate-400 to-slate-500 px-3 py-1 text-xs font-bold text-black'
                        : 'rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-3 py-1 text-xs font-bold text-black'
                    }
                  >
                    {premiumVariantOf(display) === 'essential' ? 'Premium' : 'Premium Pro'}
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

        {isOwn && form && (
          <div className="relative mt-6 space-y-3 border-t border-border pt-6">
            <h2 className="text-sm font-semibold uppercase text-slate-500">
              Elo exibido
            </h2>
            <p className="text-xs leading-relaxed text-slate-500">
              Ajuste e salve abaixo. O elo exibido é o do seu perfil no Firestore.
            </p>
            <label className="flex max-w-md flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center">
              <span className="inline-flex shrink-0 items-center gap-2 sm:min-w-[8rem]">
                <LolEloIcon elo={form.elo} className="h-9 w-9" />
                <span className="font-medium text-slate-400">Divisão</span>
              </span>
              <select
                value={eloTierForSelect(form.elo)}
                onChange={(e) => {
                  setEditForm((f) =>
                    f ? { ...f, elo: e.target.value } : f,
                  )
                  setEditDirty(true)
                }}
                className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm font-medium text-white"
              >
                {ELO_ORDER.map((eloTier) => (
                  <option key={eloTier} value={eloTier}>
                    {eloTierLabel(eloTier)}
                  </option>
                ))}
              </select>
            </label>
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
                      {roleLabel(r)}
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
                      className="rounded-lg bg-primary/20 px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-primary/35"
                    >
                      {playerTagLabel(t)}
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
            {profile?.riotPuuid ? (
              <p className="text-sm text-slate-400">
                Conta ligada: {profile.nickname ?? '?'}#{profile.tag ?? '?'}
              </p>
            ) : null}

            <div className="rounded-xl border border-dashed border-primary/35 bg-primary/[0.06] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Em breve
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Login oficial com a Riot Games para vincular e validar seu invocador no app.
              </p>
              <button
                type="button"
                disabled
                className="mt-3 inline-flex cursor-not-allowed items-center justify-center rounded-lg bg-secondary/40 px-4 py-2.5 text-sm font-semibold text-slate-500 ring-1 ring-white/10"
                title="Disponível em breve"
              >
                Conectar conta Riot
              </button>
            </div>

            <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Nick e tag no perfil
            </p>
            <div className="flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1 text-xs text-slate-500">
                Nome de invocador
                <input
                  value={riotNick}
                  onChange={(e) => setRiotNick(e.target.value)}
                  onFocus={() => {
                    riotInputFocusRef.current.nick = true
                  }}
                  onBlur={() => {
                    riotInputFocusRef.current.nick = false
                  }}
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block w-full text-xs text-slate-500 sm:w-28">
                Tag
                <input
                  value={riotTag}
                  onChange={(e) => setRiotTag(e.target.value)}
                  onFocus={() => {
                    riotInputFocusRef.current.tag = true
                  }}
                  onBlur={() => {
                    riotInputFocusRef.current.tag = false
                  }}
                  autoComplete="off"
                  placeholder="BR1"
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={linkRiotLoading}
                onClick={() => void confirmRiotId()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {linkRiotLoading ? 'Confirmando…' : 'Confirmar Riot ID'}
              </button>
            </div>
            {riotMsg ? (
              <p className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-amber-100">
                {riotMsg}
              </p>
            ) : null}
          </div>
        )}

        {isOwn && form && (
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
                    onClick={() => {
                      setEditForm((f) => (f ? { ...f, status: s } : f))
                      setEditDirty(true)
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      form.status === s
                        ? 'bg-accent text-black'
                        : 'bg-white/5 text-slate-300'
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.playingNow}
                  onChange={(e) => {
                    setEditForm((f) =>
                      f ? { ...f, playingNow: e.target.checked } : f,
                    )
                    setEditDirty(true)
                  }}
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
                  const selected = form.roles.includes(r)
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setEditForm((f) => {
                          if (!f) return f
                          const cur = f.roles
                          let next = [...cur]
                          if (selected) next = next.filter((x) => x !== r)
                          else if (next.length < 2) next.push(r)
                          return { ...f, roles: next }
                        })
                        setEditDirty(true)
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                        selected
                          ? 'bg-secondary text-white'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      <LolRoleIcon role={r} className="h-4 w-4" />
                      {roleLabel(r)}
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
                  const selected = form.queueTypes.includes(q)
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        setEditForm((f) => {
                          if (!f) return f
                          const cur = f.queueTypes
                          let next = [...cur]
                          if (selected) next = next.filter((x) => x !== q)
                          else next.push(q)
                          return { ...f, queueTypes: next }
                        })
                        setEditDirty(true)
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
                  const selected = form.playerTags.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setEditForm((f) => {
                          if (!f) return f
                          const cur = f.playerTags
                          const next = selected
                            ? cur.filter((x) => x !== t)
                            : [...cur, t]
                          return { ...f, playerTags: next }
                        })
                        setEditDirty(true)
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        selected
                          ? 'bg-primary/25 text-primary ring-2 ring-primary/50 shadow-sm shadow-primary/10'
                          : 'bg-white/5 text-slate-500 hover:bg-white/10'
                      }`}
                    >
                      {playerTagLabel(t)}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="mt-6 block border-t border-border pt-6 text-xs text-slate-500">
              Bio curta
              <textarea
                value={form.bio}
                onChange={(e) => {
                  setEditForm((f) =>
                    f ? { ...f, bio: e.target.value } : f,
                  )
                  setEditDirty(true)
                }}
                rows={3}
                maxLength={200}
                className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
              />
            </label>

            {editDirty ? (
              <div className="sticky bottom-4 z-10 mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-card/95 p-4 shadow-lg shadow-black/40 backdrop-blur-sm">
                <p className="text-sm text-slate-300">
                  Há alterações não salvas.
                </p>
                <button
                  type="button"
                  onClick={() => void saveEditForm()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-black"
                >
                  Salvar alterações
                </button>
                <button
                  type="button"
                  onClick={() => discardEditForm()}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                >
                  Descartar
                </button>
              </div>
            ) : null}

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
                  Preencha nick e tag em <strong className="font-medium text-slate-400">Conta Riot</strong>{' '}
                  para gerar o link em <span className="font-mono text-slate-400">/u/seu-nick</span>.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {isOwn && (
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">Planos e destaque</h2>
          <p className="mt-2 text-sm text-slate-400">
            Pagamento seguro com <strong className="text-slate-300">PIX</strong>,{' '}
            <strong className="text-slate-300">cartão de crédito</strong> ou{' '}
            <strong className="text-slate-300">cartão de débito</strong> (conforme disponível no checkout).
            Pagamento no{' '}
            <a
              href="https://www.asaas.com"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              site da Asaas
            </a>{' '}
            (PIX / cartão conforme o link). As URLs ficam nas constantes{' '}
            <span className="font-mono text-slate-400">URL_*</span> em{' '}
            <span className="font-mono text-slate-500">src/lib/asaasPaymentLinks.ts</span> (públicas; em
            produção substitui por links criados na{' '}
            <a
              href="https://docs.asaas.com/reference"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-slate-300 underline-offset-2 hover:underline"
            >
              API Asaas
            </a>
            ). Para o plano actualizar automaticamente no perfil, o webhook precisa de associar o pagamento
            ao teu utilizador: usa no Asaas o <strong className="text-slate-300">mesmo email</strong> da
            conta com que entras aqui. Podes configurar também um{' '}
            <strong className="text-slate-300">URL de retorno</strong> com{' '}
            <span className="font-mono text-slate-500">?pagamento=sucesso</span> (refrescar o perfil ao
            voltares).{' '}
            <a
              href="https://docs.asaas.com/docs/criando-um-link-de-pagamentos"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Documentação Asaas
            </a>
            .
            {!hasAsaasPaymentLinksConfigured() ? (
              <>
                {' '}
                Ainda sem links — usa a <span className="text-slate-300">simulação (dev)</span> abaixo.
              </>
            ) : null}
          </p>

          {paymentSandbox ? (
            <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <strong className="text-amber-50">Sandbox (UI)</strong> — em localhost esta app só mostra o
              aviso; chaves e chamadas ao{' '}
              <a
                href="https://sandbox.asaas.com"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-amber-50 underline-offset-2 hover:underline"
              >
                Asaas
              </a>{' '}
              ficam no backend separado.
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-border/80 bg-bg/40 p-4 text-sm text-slate-400">
            <p className="font-medium text-slate-200">Estado atual</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
              <li>
                Plano:{' '}
                {!premiumActive ? (
                  <span className="text-slate-300">Grátis</span>
                ) : activeVariant === 'essential' ? (
                  <span className="text-slate-300">
                    Premium Essencial ({formatBrlFromCents(PRICE_PREMIUM_ESSENTIAL_CENTS)}/mês)
                  </span>
                ) : (
                  <span className="text-slate-300">
                    Premium Pro ({formatBrlFromCents(PRICE_PREMIUM_COMPLETE_CENTS)}/mês)
                  </span>
                )}
                {profile?.premiumUntil && typeof profile.premiumUntil.toDate === 'function' ? (
                  <span className="text-slate-500">
                    {' '}
                    · válido até {profile.premiumUntil.toDate().toLocaleString('pt-BR')}
                  </span>
                ) : null}
              </li>
              <li>
                Destaque na lista:{' '}
                {profile?.boostUntil &&
                typeof profile.boostUntil.toMillis === 'function' &&
                profile.boostUntil.toMillis() > Date.now() ? (
                  <span className="text-primary">
                    ativo até{' '}
                    {profile.boostUntil.toDate().toLocaleString('pt-BR')}
                  </span>
                ) : (
                  <span className="text-slate-500">inativo</span>
                )}
              </li>
            </ul>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col rounded-xl border border-border bg-white/[0.03] p-5">
              <h3 className="text-base font-semibold text-white">Premium Essencial</h3>
              <p className="mt-1 text-2xl font-bold text-primary">
                {formatBrlFromCents(PRICE_PREMIUM_ESSENTIAL_CENTS)}
                <span className="text-sm font-normal text-slate-500"> /mês</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-xs text-slate-400">
                <li>Filtros avançados na lista de jogadores (elo máx., combinações)</li>
                <li>Favoritos ilimitados</li>
                <li>Selo Premium no perfil</li>
                <li className="text-slate-500">Não inclui estatísticas detalhadas nem push</li>
              </ul>
              <button
                type="button"
                onClick={() => startCheckout(PRODUCT_REF.premiumEssential)}
                className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-black hover:bg-primary/90"
              >
                Assinar Essencial
              </button>
            </div>

            <div className="flex flex-col rounded-xl border border-amber-500/35 bg-amber-500/[0.06] p-5 ring-1 ring-amber-500/20">
              <h3 className="text-base font-semibold text-white">Premium Pro</h3>
              <p className="mt-1 text-2xl font-bold text-amber-400">
                {formatBrlFromCents(PRICE_PREMIUM_COMPLETE_CENTS)}
                <span className="text-sm font-normal text-slate-500"> /mês</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-xs text-slate-300">
                <li>Tudo do Essencial</li>
                <li>Estatísticas detalhadas no perfil</li>
                <li>Notificações push (novos jogadores, mensagens)</li>
              </ul>
              <button
                type="button"
                onClick={() => startCheckout(PRODUCT_REF.premiumComplete)}
                className="mt-4 w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-sm font-bold text-black hover:opacity-95"
              >
                Assinar Pro
              </button>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Destaque temporário na lista
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Sobe a prioridade na ordenação dos jogadores (junto com outros em destaque). Pode
              acumular tempo se comprar de novo antes de expirar.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 flex-col rounded-xl border border-border bg-bg/50 p-4">
                <span className="text-lg font-bold text-white">
                  {formatBrlFromCents(PRICE_BOOST_1H_CENTS)}
                </span>
                <span className="text-xs text-slate-500">1 hora de destaque</span>
                <button
                  type="button"
                  onClick={() => startCheckout(PRODUCT_REF.boost1h)}
                  className="mt-3 rounded-lg border border-primary/50 bg-primary/10 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
                >
                  Comprar 1 h
                </button>
              </div>
              <div className="flex flex-1 flex-col rounded-xl border border-accent/40 bg-accent/5 p-4">
                <span className="text-lg font-bold text-accent">
                  {formatBrlFromCents(PRICE_BOOST_2H_CENTS)}
                </span>
                <span className="text-xs text-slate-500">2 horas de destaque</span>
                <button
                  type="button"
                  onClick={() => startCheckout(PRODUCT_REF.boost2h)}
                  className="mt-3 rounded-lg border border-accent/50 bg-accent/15 py-2 text-xs font-semibold text-amber-100 hover:bg-accent/25"
                >
                  Comprar 2 h
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-dashed border-slate-600 bg-bg/30 p-4">
            <p className="text-xs font-medium uppercase text-slate-500">Simulação (apenas dev)</p>
            <p className="mt-1 text-xs text-slate-600">
              Aplica alterações direto no Firestore para testar a UI. Em produção só o servidor (webhook de
              pagamento) deve alterar plano, datas e destaque.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!user) return
                  await persistProfile(user.uid, {
                    plan: 'premium',
                    premiumVariant: 'essential',
                    premiumUntil: Timestamp.fromMillis(
                      Date.now() + PREMIUM_SUBSCRIPTION_DAYS * 86400000,
                    ),
                  })
                  await refreshProfile()
                  toast.success('Simulado: Premium Essencial 30 dias.')
                }}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/15"
              >
                Simular Essencial 30d
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!user) return
                  await persistProfile(user.uid, {
                    plan: 'premium',
                    premiumVariant: 'complete',
                    premiumUntil: Timestamp.fromMillis(
                      Date.now() + PREMIUM_SUBSCRIPTION_DAYS * 86400000,
                    ),
                  })
                  await refreshProfile()
                  toast.success('Simulado: Premium Pro 30 dias.')
                }}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/15"
              >
                Simular Pro 30d
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!user || !profile) return
                  const next = extendBoostUntil(profile.boostUntil, BOOST_1H_MS)
                  await persistProfile(user.uid, { boostUntil: next })
                  await refreshProfile()
                  toast.success('Simulado: +1 h de destaque.')
                }}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/15"
              >
                Simular boost +1 h (R$ 3)
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!user || !profile) return
                  const next = extendBoostUntil(profile.boostUntil, BOOST_2H_MS)
                  await persistProfile(user.uid, { boostUntil: next })
                  await refreshProfile()
                  toast.success('Simulado: +2 h de destaque.')
                }}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/15"
              >
                Simular boost +2 h (R$ 5)
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!user) return
                  await persistProfile(user.uid, {
                    plan: 'free',
                    premiumVariant: null,
                    premiumUntil: null,
                    boostUntil: null,
                  })
                  await refreshProfile()
                  toast.success('Simulado: removido plano e destaque.')
                }}
                className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
              >
                Limpar plano e boost
              </button>
            </div>
          </div>
        </div>
      )}

      {isOwn && (
        <div className="rounded-2xl border border-border bg-card/80 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">
            Estatísticas detalhadas
            {!statsUnlocked && (
              <span className="ml-2 text-xs font-normal text-accent">
                (Premium Pro — {formatBrlFromCents(PRICE_PREMIUM_COMPLETE_CENTS)}/mês)
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
              Incluído no <strong className="text-slate-400">Premium Pro</strong> (
              {formatBrlFromCents(PRICE_PREMIUM_COMPLETE_CENTS)}/mês). O Essencial mantém filtros e
              favoritos, sem este painel.
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
