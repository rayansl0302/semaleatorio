import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { Helmet } from 'react-helmet-async'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase/config'
import { hasSemiAleatorioSeal } from '../lib/seal'
import { BrandLogo } from '../components/BrandLogo'
import { LolEloIcon, LolRoleIcon } from '../components/LolIcons'
import { getPublicSiteUrl } from '../lib/siteUrl'
import type { UserProfile } from '../types/models'

export function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const { user, firebaseConfigured } = useAuth()
  const navigate = useNavigate()
  const [target, setTarget] = useState<UserProfile | null>(null)
  const [ambiguous, setAmbiguous] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !slug) {
      setTarget(null)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const q = query(
        collection(db, 'users'),
        where('profileSlug', '==', slug.toLowerCase()),
        limit(5),
      )
      const snap = await getDocs(q)
      const list: UserProfile[] = []
      snap.forEach((d) => list.push(d.data() as UserProfile))
      if (cancelled) return
      if (list.length > 1) setAmbiguous(true)
      else setAmbiguous(false)
      const p = list[0] ?? null
      if (p?.shadowBanned) setTarget(null)
      else setTarget(p)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

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
  const seal = target && (hasSemiAleatorioSeal(target) || target.semiAleatorio)
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
      <div className="min-h-dvh bg-bg px-4 py-16 text-center text-slate-400">
        <Helmet>
          <title>Perfil não encontrado — SemAleatório</title>
        </Helmet>
        <p>Perfil não encontrado ou indisponível.</p>
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          Voltar ao início
        </Link>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>
          {`${fullNick} no SemAleatório — ${target.elo ?? 'UNRANKED'}`}
        </title>
        <meta
          name="description"
          content={`Jogue duo ou flex com ${fullNick} (${target.elo ?? 'UNRANKED'}) no SemAleatório — comunidade BR de League of Legends.`}
        />
        <meta property="og:title" content={`Jogar com ${fullNick} — SemAleatório`} />
        <meta
          property="og:description"
          content={`${target.elo ?? 'UNRANKED'} · ${target.status === 'LFG' ? 'Procurando time' : 'Perfil público'}`}
        />
        <meta property="og:type" content="profile" />
        {site ? <meta property="og:url" content={`${site}/u/${slug}`} /> : null}
        {site ? (
          <meta property="og:image" content={`${site}/logo_completa.png`} />
        ) : null}
      </Helmet>

      <div className="min-h-dvh bg-bg text-slate-200">
        <header className="border-b border-border px-4 py-1 sm:py-1.5">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
            <Link
              to="/"
              className="block shrink-0 rounded-md p-0 leading-none ring-offset-2 ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <BrandLogo
                variant="text"
                className="leading-none"
                imgClassName="h-14 w-auto max-w-[min(100vw-9rem,22rem)] object-left sm:h-[4.25rem] md:h-[4.75rem] lg:h-20"
                loading="eager"
              />
            </Link>
            <Link
              to="/app/jogadores"
              className="text-sm text-slate-400 hover:text-white"
            >
              Mural
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-lg px-4 py-10">
          {ambiguous && (
            <p className="mb-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">
              Existe mais de um perfil com este link. Se for seu caso, ajuste o nick
              ou tag no perfil para um slug único.
            </p>
          )}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h1 className="text-2xl font-bold text-white">
              {target.nickname}
              <span className="text-muted">#{target.tag}</span>
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <LolEloIcon elo={target.elo} className="h-9 w-9" />
              <p className="text-lg text-primary">{target.elo}</p>
            </div>
            {target.roles && target.roles.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Rotas:</span>
                {target.roles.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs font-medium text-slate-300"
                  >
                    <LolRoleIcon role={r} className="h-4 w-4" />
                    {r}
                  </span>
                ))}
              </div>
            )}
            {seal && (
              <span className="mt-2 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/40">
                SemAleatório ✔
              </span>
            )}
            {target.bio ? (
              <p className="mt-4 text-sm text-slate-400">{target.bio}</p>
            ) : null}

            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(fullNick)
                }}
                className="w-full rounded-xl bg-primary py-3 text-center font-bold text-black"
              >
                Copiar nick completo
              </button>
              {user && user.uid !== target.uid ? (
                <Link
                  to={`/app/mensagens?com=${encodeURIComponent(target.uid)}`}
                  className="w-full rounded-xl border border-secondary/50 bg-secondary/15 py-3 text-center text-sm font-semibold text-white transition hover:bg-secondary/25"
                >
                  Enviar mensagem
                </Link>
              ) : !user ? (
                <Link
                  to={`/entrar?redirect=${encodeURIComponent(`/app/mensagens?com=${encodeURIComponent(target.uid)}`)}`}
                  className="w-full rounded-xl border border-secondary/50 bg-secondary/15 py-3 text-center text-sm font-semibold text-white transition hover:bg-secondary/25"
                >
                  Entrar para enviar mensagem
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => void playWithThem()}
                className="w-full rounded-xl border border-border py-3 font-semibold text-white hover:bg-white/5"
              >
                {user ? 'Abrir mural LFG' : 'Entrar e jogar com esse cara'}
              </button>
              <a
                href="riotclient://"
                className="w-full rounded-xl border border-border py-3 text-center text-sm text-slate-400 hover:bg-white/5"
              >
                Tentar abrir o Riot Client
              </a>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
