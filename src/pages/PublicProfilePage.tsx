import {
  collection,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { Helmet } from 'react-helmet-async'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { db } from '../firebase/config'
import {
  normalizeUserFromFirestore,
  profileSlugIndexDoc,
  userProfileDoc,
} from '../lib/firestoreUserProfile'
import {
  aggregateFromOverallValues,
  mergeRatingIntoProfile,
  type RatingAgg,
} from '../lib/ratingsFirestore'
import { isPremiumActive, premiumVariantOf } from '../lib/plan'
import { hasSemiAleatorioSeal } from '../lib/seal'
import {
  BrandLogo,
  BRAND_LOGO_TEXT_COMPACT_HEADER_IMG_CLASS,
  BRAND_LOGO_TEXT_HEADER_IMG_CLASS,
} from '../components/BrandLogo'
import { LolEloIcon, LolRoleIcon } from '../components/LolIcons'
import { Copy, MessageCircle } from '../lib/icons'
import { formatEloDisplay, roleLabel } from '../lib/constants'
import { getPublicSiteUrl } from '../lib/siteUrl'
import type { UserProfile } from '../types/models'

export function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const { user, firebaseConfigured } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [target, setTarget] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [ratingAgg, setRatingAgg] = useState<RatingAgg | null>(null)

  useEffect(() => {
    if (!db || !slug) {
      setTarget(null)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const idxSnap = await getDoc(profileSlugIndexDoc(db, slug))
      if (cancelled) return
      if (!idxSnap.exists()) {
        setTarget(null)
        setLoading(false)
        return
      }
      const idxVal = idxSnap.data() as { uid?: string }
      const uid = typeof idxVal?.uid === 'string' ? idxVal.uid : ''
      if (!uid) {
        setTarget(null)
        setLoading(false)
        return
      }
      const usrSnap = await getDoc(userProfileDoc(db, uid))
      if (cancelled) return
      if (!usrSnap.exists()) {
        setTarget(null)
        setLoading(false)
        return
      }
      const p = normalizeUserFromFirestore(usrSnap.data(), uid)
      if (p?.shadowBanned || p?.adminPanelOnly) setTarget(null)
      else setTarget(p)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (!db || !target?.uid) {
      setRatingAgg(null)
      return
    }
    const q = query(collection(db, 'ratings'), where('toUid', '==', target.uid))
    const unsub = onSnapshot(q, (snap) => {
      const vals: number[] = []
      snap.forEach((d) => {
        const ov = (d.data() as { overall?: number }).overall
        if (typeof ov === 'number') vals.push(ov)
      })
      setRatingAgg(aggregateFromOverallValues(vals))
    })
    return () => unsub()
  }, [target?.uid])

  function playWithThem() {
    if (!target || !slug) return
    if (!firebaseConfigured) {
      navigate('/app/jogadores')
      return
    }
    if (!user) {
      navigate(`/entrar?redirect=${encodeURIComponent(`/u/${slug}`)}`)
      return
    }
    navigate('/app/jogadores')
  }

  const fullNick = target ? `${target.nickname}#${target.tag}` : ''
  const targetMerged = target
    ? mergeRatingIntoProfile(target, ratingAgg ?? undefined)
    : null
  const seal =
    targetMerged &&
    (hasSemiAleatorioSeal(targetMerged) || targetMerged.semiAleatorio)
  const site = getPublicSiteUrl()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-slate-500">
        Carregando…
      </div>
    )
  }

  if (!target) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
        <Link
          to="/"
          className="block rounded-md p-0 leading-none ring-offset-2 ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <BrandLogo
            variant="text"
            className="leading-none"
            imgClassName={BRAND_LOGO_TEXT_COMPACT_HEADER_IMG_CLASS}
            loading="eager"
          />
        </Link>
        <p className="text-slate-400">Perfil não encontrado.</p>
        <Link to="/" className="text-primary underline-offset-2 hover:underline">
          Voltar ao início
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-bg text-slate-100">
      <Helmet>
        <title>{`${fullNick} · SemAleatório`}</title>
        <meta
          name="description"
          content={`${formatEloDisplay(target.elo)} · perfil público no SemAleatório.`}
        />
      </Helmet>
      <header className="border-b border-border bg-card/50 px-4 py-2 backdrop-blur-sm sm:py-2.5">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 sm:gap-4">
          <Link
            to="/"
            className="block shrink-0 rounded-md p-0 leading-none ring-offset-2 ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <BrandLogo
              variant="text"
              className="leading-none"
              imgClassName={BRAND_LOGO_TEXT_HEADER_IMG_CLASS}
              loading="eager"
            />
          </Link>
          <span className="text-xs text-slate-500">Perfil público</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/20">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/40 to-primary/30 text-2xl font-black text-white">
              {(target.nickname?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-white">
                {target.nickname}
                <span className="font-normal text-slate-500">#{target.tag}</span>
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-bg/80 px-3 py-1 ring-1 ring-border">
                  <LolEloIcon elo={target.elo} className="h-7 w-7" />
                  <span className="font-semibold text-primary">
                    {formatEloDisplay(target.elo)}
                  </span>
                </span>
                {isPremiumActive(target) && (
                  <span
                    className={
                      premiumVariantOf(target) === 'essential'
                        ? 'rounded-full bg-gradient-to-r from-slate-400 to-slate-500 px-3 py-1 text-xs font-bold text-black'
                        : 'rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-3 py-1 text-xs font-bold text-black'
                    }
                  >
                    {premiumVariantOf(target) === 'essential' ? 'Premium' : 'Premium Pro'}
                  </span>
                )}
                {(() => {
                  const endMs =
                    target.boostUntil &&
                    typeof target.boostUntil.toMillis === 'function'
                      ? target.boostUntil.toMillis()
                      : 0
                  if (endMs <= Date.now()) return null
                  const totalMin = Math.ceil((endMs - Date.now()) / 60_000)
                  const h = Math.floor(totalMin / 60)
                  const m = totalMin % 60
                  const label = h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`
                  return (
                    <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-bold text-accent ring-1 ring-accent/30">
                      ⚡ {label}
                    </span>
                  )
                })()}
                {seal && (
                  <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/40">
                    SemAleatório ✔
                  </span>
                )}
              </div>
            </div>
          </div>
          {target.bio ? (
            <p className="mt-4 text-sm leading-relaxed text-slate-400">{target.bio}</p>
          ) : null}
          {target.roles && target.roles.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {target.roles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-300"
                >
                  <LolRoleIcon role={r} className="h-4 w-4" />
                  {roleLabel(r)}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(`${site}/u/${slug}`).then(
                () => toast.success('Link copiado.'),
                () => toast.error('Não foi possível copiar.'),
              )
            }}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-white hover:bg-white/5"
          >
            <Copy className="h-4 w-4" />
            Copiar link
          </button>
          <button
            type="button"
            onClick={playWithThem}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-black hover:bg-primary/90"
          >
            <MessageCircle className="h-4 w-4" />
            Procurar no mural
          </button>
        </div>
      </main>
    </div>
  )
}
