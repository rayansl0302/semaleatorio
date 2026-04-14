import { useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { PostCard } from '../components/PostCard'
import { PostComposer } from '../components/PostComposer'
import { LolEloIcon } from '../components/LolIcons'
import { FirebaseConfigNotice } from '../components/FirebaseConfigNotice'
import { useAuth } from '../contexts/AuthContext'
import { firebaseFeedBlockedReason } from '../firebase/config'
import { useAppConfig } from '../hooks/useAppConfig'
import { usePlayers } from '../hooks/usePlayers'
import { usePosts } from '../hooks/usePosts'
import { isPremiumActive, premiumVariantOf } from '../lib/plan'
import { formatLastSeenAgo, isRecentlyActive } from '../lib/timeAgoFirestore'
import type { UserProfile } from '../types/models'

export function FeedHomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const appConfig = useAppConfig()
  const { players } = usePlayers()
  const { posts, error: postsError } = usePosts()

  const lfgCount = useMemo(
    () => players.filter((p) => p.status === 'LFG' && !p.shadowBanned).length,
    [players],
  )

  const pulse = Math.max(lfgCount, appConfig.onlineCountFloor)

  const presenceList = useMemo(() => {
    const list = players.filter((p) => !p.shadowBanned) as UserProfile[]

    function tierOf(p: UserProfile): number {
      if (isPremiumActive(p)) {
        return premiumVariantOf(p) === 'complete' ? 3 : 2
      }
      const b = p.boostUntil
      if (b && typeof b.toMillis === 'function' && b.toMillis() > Date.now()) return 1
      return 0
    }

    return list
      .map((p) => ({
        p,
        tier: tierOf(p),
        t: p.lastOnline?.toMillis?.() ?? 0,
      }))
      .sort((a, b) => {
        if (a.tier !== b.tier) return b.tier - a.tier
        return b.t - a.t
      })
      .slice(0, 28)
      .map((x) => x.p)
  }, [players])

  if (firebaseFeedBlockedReason()) {
    return <FirebaseConfigNotice />
  }

  return (
    <>
      <Helmet>
        <title>Início — Busca de time e dupla · SemAleatório</title>
        <meta
          name="description"
          content="Pedidos de duo, flex e Clash em tempo real. Encontre parceiros no Brasil — SemAleatório."
        />
      </Helmet>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <aside className="w-full shrink-0 lg:w-72 lg:pt-1">
          <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-lg shadow-black/20 backdrop-blur-sm lg:sticky lg:top-24">
            <h2 className="text-sm font-bold tracking-tight text-white">
              Jogadores · presença
            </h2>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              Ordenados pela última vez que o app registrou atividade (não é status
              do cliente da Riot).
            </p>
            <ul className="mt-3 max-h-[min(55vh,400px)] space-y-0.5 overflow-y-auto pr-1">
              {presenceList.length === 0 ? (
                <li className="py-6 text-center text-xs text-slate-500">
                  Nenhum perfil ainda.
                </li>
              ) : (
                presenceList.map((p) => {
                  const active = isRecentlyActive(p.lastOnline)
                  const ago = formatLastSeenAgo(p.lastOnline)
                  const initial = (p.nickname?.[0] ?? '?').toUpperCase()
                  const pPremium = isPremiumActive(p)
                  const pVar = pPremium ? premiumVariantOf(p) : null
                  const pBoosted =
                    p.boostUntil &&
                    typeof p.boostUntil.toMillis === 'function' &&
                    p.boostUntil.toMillis() > Date.now()

                  const isPro = pPremium && pVar === 'complete'
                  const isEssential = pPremium && pVar === 'essential'

                  const itemClass = isPro
                    ? 'relative overflow-hidden rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-900/30 via-amber-800/10 to-transparent px-2.5 py-2.5 shadow-[0_0_12px_-3px_rgba(251,191,36,0.3)] hover:shadow-[0_0_18px_-2px_rgba(251,191,36,0.4)] hover:border-amber-400/80'
                    : isEssential
                      ? 'relative overflow-hidden rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-900/20 via-cyan-800/5 to-transparent px-2.5 py-2.5 shadow-[0_0_10px_-3px_rgba(34,211,238,0.2)] hover:shadow-[0_0_14px_-2px_rgba(34,211,238,0.3)] hover:border-cyan-400/60'
                      : pBoosted
                        ? 'relative overflow-hidden rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-900/20 via-emerald-800/5 to-transparent px-2.5 py-2.5 shadow-[0_0_10px_-3px_rgba(52,211,153,0.25)] hover:shadow-[0_0_14px_-2px_rgba(52,211,153,0.35)] hover:border-emerald-400/70'
                        : 'rounded-xl px-2 py-2 hover:bg-white/[0.06]'

                  const avatarBg = isPro
                    ? 'bg-gradient-to-br from-amber-600/60 to-amber-900/40 ring-2 ring-amber-400/70 shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                    : isEssential
                      ? 'bg-gradient-to-br from-cyan-600/40 to-cyan-900/30 ring-2 ring-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                      : pBoosted
                        ? 'bg-gradient-to-br from-emerald-600/40 to-emerald-900/30 ring-2 ring-emerald-400/60 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                        : 'bg-secondary/35'

                  return (
                    <li key={p.uid} className={isPro || isEssential || pBoosted ? 'mt-1.5' : ''}>
                      <button
                        type="button"
                        onClick={() => navigate(`/app/perfil?u=${p.uid}`)}
                        className={`flex w-full items-center gap-2.5 text-left transition-all duration-200 ${itemClass}`}
                      >
                        {isPro && (
                          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(251,191,36,0.06)_45%,rgba(251,191,36,0.12)_50%,rgba(251,191,36,0.06)_55%,transparent_60%)] animate-[shimmer_3s_infinite]" />
                        )}
                        <div className="relative shrink-0">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${avatarBg}`}>
                            {initial}
                          </span>
                          <span
                            className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-card ${
                              active ? 'bg-primary' : 'bg-slate-600'
                            }`}
                            title={active ? 'Ativo agora' : 'Inativo'}
                          />
                        </div>
                        <div className="relative min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <LolEloIcon elo={p.elo} className="h-4 w-4 shrink-0" />
                            <span className={`truncate text-xs font-semibold ${isPro ? 'text-amber-200' : isEssential ? 'text-cyan-100' : 'text-white'}`}>
                              {p.nickname}
                              <span className={isPro ? 'text-amber-500/60' : isEssential ? 'text-cyan-400/40' : 'text-slate-500'}>#{p.tag}</span>
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1">
                            {isPro && (
                              <span className="rounded bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wider text-amber-950 shadow-sm shadow-amber-400/30">
                                PRO
                              </span>
                            )}
                            {isEssential && (
                              <span className="rounded bg-gradient-to-r from-cyan-300 via-cyan-200 to-cyan-400 px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wider text-cyan-950 shadow-sm shadow-cyan-400/20">
                                Premium
                              </span>
                            )}
                            {(() => {
                              const endMs =
                                p.boostUntil &&
                                typeof p.boostUntil.toMillis === 'function'
                                  ? p.boostUntil.toMillis()
                                  : 0
                              if (endMs <= Date.now()) return null
                              const totalMin = Math.ceil((endMs - Date.now()) / 60_000)
                              const h = Math.floor(totalMin / 60)
                              const m = totalMin % 60
                              const label = h > 0 ? `${h}h${m > 0 ? `${m}m` : ''}` : `${m}m`
                              return (
                                <span className="rounded bg-emerald-500/20 px-1.5 py-px text-[9px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                                  ⚡ {label}
                                </span>
                              )
                            })()}
                            <span className="text-[10px] text-slate-500">
                              {active ? (
                                <span className={isPro ? 'text-amber-300/80' : isEssential ? 'text-cyan-300/70' : 'text-primary/90'}>online</span>
                              ) : (
                                <>visto {ago}</>
                              )}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
            <Link
              to="/app/jogadores"
              className="mt-3 block rounded-lg border border-border py-2 text-center text-xs font-medium text-primary transition hover:border-primary/40 hover:bg-primary/5"
            >
              Abrir mural completo
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-8">
          <header className="relative overflow-hidden rounded-2xl border border-border bg-card px-5 py-6 sm:px-8 sm:py-8">
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/15 blur-3xl"
              aria-hidden
            />
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Início
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Busca de time e dupla
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              Publique ou responda pedidos de parceiro para duo, flex e Clash. Para ver
              quem está disponível na hora, abra o mural de jogadores.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                to="/app/jogadores"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-black transition hover:bg-primary/90"
              >
                Ver jogadores disponíveis
              </Link>
              <span className="text-sm text-slate-500">
                ~{pulse} em busca de partida
              </span>
            </div>
          </header>

          {user && (
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                to="/app/perfil"
                className="rounded-lg border border-border px-4 py-2 text-slate-300 transition hover:border-primary/40 hover:text-white"
              >
                Meu perfil
              </Link>
              <Link
                to="/app/mensagens"
                className="rounded-lg border border-border px-4 py-2 text-slate-300 transition hover:border-primary/40 hover:text-white"
              >
                Mensagens
              </Link>
            </div>
          )}

          <section>
            <h2 className="mb-4 text-lg font-bold text-white">Publicar</h2>
            {user ? (
              <PostComposer uid={user.uid} />
            ) : (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-slate-400">
                <Link
                  to="/entrar?redirect=/app"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Faça login
                </Link>{' '}
                com Google ou e-mail para criar posts no feed.
              </div>
            )}
          </section>

          <section className="border-t border-border pt-8">
            <h2 className="mb-4 text-lg font-bold text-white">Últimos posts</h2>
            {postsError && (
              <p className="mb-3 text-sm text-red-400">Erro: {postsError}</p>
            )}
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  viewerUid={user?.uid}
                  onAuthorClick={(uid) => navigate(`/app/perfil?u=${uid}`)}
                />
              ))}
            </div>
            {posts.length === 0 && (
              <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-slate-500">
                Nenhum post ainda. Seja o primeiro a pedir duo ou flex — ou abra{' '}
                <Link to="/app/jogadores" className="text-primary hover:underline">
                  jogadores
                </Link>{' '}
                para ver quem está procurando time ou dupla.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
