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
    return list
      .map((p) => ({
        p,
        t: p.lastOnline?.toMillis?.() ?? 0,
      }))
      .sort((a, b) => b.t - a.t)
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
                  return (
                    <li key={p.uid}>
                      <button
                        type="button"
                        onClick={() => navigate(`/app/perfil?u=${p.uid}`)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.06]"
                      >
                        <div className="relative shrink-0">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/35 text-xs font-bold text-white">
                            {initial}
                          </span>
                          <span
                            className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-card ${
                              active ? 'bg-primary' : 'bg-slate-600'
                            }`}
                            title={active ? 'Ativo agora' : 'Inativo'}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <LolEloIcon elo={p.elo} className="h-4 w-4 shrink-0" />
                            <span className="truncate text-xs font-medium text-white">
                              {p.nickname}
                              <span className="text-slate-500">#{p.tag}</span>
                            </span>
                          </div>
                          <p className="truncate text-[10px] text-slate-500">
                            {active ? (
                              <span className="text-primary/90">online agora</span>
                            ) : (
                              <>visto {ago}</>
                            )}
                          </p>
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
