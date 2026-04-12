import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CallModal } from '../components/CallModal'
import { PlayersMessagesDock } from '../components/PlayersMessagesDock'
import { PlayerCard } from '../components/PlayerCard'
import { ReportPlayerModal } from '../components/ReportPlayerModal'
import {
  SidebarFilters,
  defaultFilter,
  type FilterState,
} from '../components/SidebarFilters'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase/config'
import { useAppConfig } from '../hooks/useAppConfig'
import { usePlayers } from '../hooks/usePlayers'
import { useSeedProfiles } from '../hooks/useSeedProfiles'
import { FREE_FAVORITES_LIMIT } from '../lib/constants'
import { filterPlayers } from '../lib/filterPlayers'
import { isPremiumActive } from '../lib/plan'
import type { PlayerListItem, UserProfile } from '../types/models'
import { Helmet } from 'react-helmet-async'

export function PlayersPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const appConfig = useAppConfig()
  const seeds = useSeedProfiles()
  const { players, error } = usePlayers()
  const [filters, setFilters] = useState<FilterState>(defaultFilter)
  const [advancedPreview, setAdvancedPreview] = useState(false)
  const [callTarget, setCallTarget] = useState<UserProfile | null>(null)
  const [reportTarget, setReportTarget] = useState<UserProfile | null>(null)

  const isPremium = isPremiumActive(profile)
  const eloMaxEnabled = isPremium || advancedPreview

  const visible = useMemo(
    () => filterPlayers(players, filters, { eloMaxEnabled }),
    [players, filters, eloMaxEnabled],
  )

  const othersReal = useMemo(
    () => visible.filter((p) => !user || p.uid !== user.uid),
    [visible, user],
  )

  const seedList = useMemo((): PlayerListItem[] => {
    const f = filters
    return seeds.filter((s) => {
      if (f.statusLfgOnly && s.status !== 'LFG') return false
      if (f.role !== 'ANY' && !s.roles?.includes(f.role)) return false
      if (f.queueType && !s.queueTypes?.includes(f.queueType)) return false
      return true
    })
  }, [seeds, filters])

  const others: PlayerListItem[] = useMemo(() => {
    if (othersReal.length > 0) return othersReal.map((p) => ({ ...p }))
    if (seedList.length > 0) return seedList
    return []
  }, [othersReal, seedList])

  const lfgReal = useMemo(
    () =>
      players.filter((p) => p.status === 'LFG' && !p.shadowBanned).length,
    [players],
  )

  const presenceLabel = useMemo(() => {
    const floor = appConfig.onlineCountFloor
    const n = Math.max(lfgReal, othersReal.length > 0 ? lfgReal : floor)
    return n
  }, [lfgReal, othersReal.length, appConfig.onlineCountFloor])

  async function copyNick(p: UserProfile) {
    const t = `${p.nickname}#${p.tag}`
    try {
      await navigator.clipboard.writeText(t)
    } catch {
      window.prompt('Copie o nick:', t)
    }
  }

  async function toggleFavorite(target: UserProfile) {
    if (!user || !db || !profile) return
    const favs = profile.favoriteUids ?? []
    const isFav = favs.includes(target.uid)
    if (!isFav && !isPremium && favs.length >= FREE_FAVORITES_LIMIT) {
      alert(
        `Plano free: até ${FREE_FAVORITES_LIMIT} favoritos. Premium = favoritos ilimitados.`,
      )
      return
    }
    const ref = doc(db, 'users', user.uid)
    await updateDoc(ref, {
      favoriteUids: isFav ? arrayRemove(target.uid) : arrayUnion(target.uid),
    })
    await refreshProfile()
  }

  if (!db) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-100">
        <h1 className="text-lg font-semibold">Configure o Firebase</h1>
        <p className="mt-2 text-sm opacity-90">
          Copie <code className="rounded bg-black/30 px-1">.env.example</code> para{' '}
          <code className="rounded bg-black/30 px-1">.env</code> e preencha com
          as chaves do projeto Firebase. Depois rode{' '}
          <code className="rounded bg-black/30 px-1">npm run dev</code> de novo.
        </p>
      </div>
    )
  }

  const showingSeeds = othersReal.length === 0 && seedList.length > 0

  return (
    <>
      <Helmet>
        <title>Jogadores — SemAleatório</title>
        <meta
          name="description"
          content="Filtre por elo, rota e fila. Encontre duo e flex BR no SemAleatório."
        />
      </Helmet>

      <div
        className={`flex flex-col gap-8 lg:flex-row lg:items-start ${user ? 'pb-24 sm:pb-8' : ''}`}
      >
        <SidebarFilters
          value={filters}
          onChange={setFilters}
          advanced={advancedPreview}
          onToggleAdvanced={
            isPremium ? undefined : () => setAdvancedPreview((v) => !v)
          }
          premiumOnlyAdvanced={!isPremium}
        />

        <div className="min-w-0 flex-1 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              <Link
                to="/app"
                className="font-medium text-primary hover:underline"
              >
                ← Voltar ao feed
              </Link>
            </p>
          </div>

          <section className="rounded-xl border border-border bg-card/80 px-4 py-3 text-sm text-slate-400">
            <span className="font-semibold text-white">Ao vivo BR:</span>{' '}
            ~{presenceLabel} perfis em busca de partida (picos de horário).{' '}
            {showingSeeds && (
              <span className="text-slate-500">
                Abaixo há perfis de exemplo até a comunidade encher — cadastre-se e
                apareça na lista real.
              </span>
            )}
          </section>

          {!isPremium && (
            <section className="rounded-xl border border-secondary/30 bg-secondary/10 p-4 text-sm text-blue-100">
              <span className="font-semibold text-white">Premium</span> — destaque
              na lista, filtros avançados, favoritos ilimitados, stats e alertas push
              (FCM). O núcleo continua{' '}
              <span className="text-primary">grátis</span>.
              <button
                type="button"
                className="ml-2 text-accent underline hover:no-underline"
                onClick={() => navigate('/app/perfil')}
              >
                Ver planos
              </button>
            </section>
          )}

          {error && (
            <p className="text-sm text-red-400">
              Erro ao carregar jogadores: {error}
            </p>
          )}

          <section>
            <h1 className="mb-1 text-xl font-bold text-white sm:text-2xl">
              Disponíveis agora
            </h1>
            <p className="mb-4 text-sm text-slate-500">
              {others.length} perfil{others.length !== 1 ? 's' : ''}
              {showingSeeds ? ' · exemplos' : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {others.map((p) => (
                <PlayerCard
                  key={p.uid}
                  player={p}
                  isSeed={!!p.isSeed}
                  onCall={() => setCallTarget(p)}
                  onCopy={() => copyNick(p)}
                  onFavorite={
                    user && !p.isSeed
                      ? () => {
                          void toggleFavorite(p)
                        }
                      : undefined
                  }
                  favorited={profile?.favoriteUids?.includes(p.uid)}
                  favoriteDisabled={
                    !isPremium &&
                    (profile?.favoriteUids?.length ?? 0) >=
                      FREE_FAVORITES_LIMIT &&
                    !profile?.favoriteUids?.includes(p.uid)
                  }
                  onReport={
                    user && !p.isSeed && p.uid !== user.uid
                      ? () => setReportTarget(p)
                      : undefined
                  }
                />
              ))}
            </div>
            {others.length === 0 && (
              <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm leading-relaxed text-slate-500">
                Nenhum jogador com esses filtros. Ajuste os filtros ou crie docs em{' '}
                <code className="rounded bg-white/5 px-1 py-0.5 text-slate-300">
                  seed_profiles
                </code>{' '}
                no Firestore para nunca ficar vazio no lançamento.
              </p>
            )}
          </section>
        </div>

        <CallModal
          open={!!callTarget}
          player={callTarget}
          onClose={() => setCallTarget(null)}
          onCopy={() => callTarget && void copyNick(callTarget)}
        />

        {user && (
          <ReportPlayerModal
            open={!!reportTarget}
            target={reportTarget}
            fromUid={user.uid}
            onClose={() => setReportTarget(null)}
          />
        )}
      </div>

      {user && <PlayersMessagesDock />}
    </>
  )
}
