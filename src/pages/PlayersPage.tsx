import { getDoc, updateDoc } from 'firebase/firestore'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CallModal } from '../components/CallModal'
import { PlayerCard } from '../components/PlayerCard'
import { ReportPlayerModal } from '../components/ReportPlayerModal'
import {
  SidebarFilters,
  defaultFilter,
  type FilterState,
} from '../components/SidebarFilters'
import { FirebaseConfigNotice } from '../components/FirebaseConfigNotice'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { db, firebaseFeedBlockedReason } from '../firebase/config'
import {
  normalizeUserFromFirestore,
  userProfileDoc,
} from '../lib/firestoreUserProfile'
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
  const toast = useToast()
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
      toast.success('Nick copiado para a área de transferência.')
    } catch {
      window.prompt('Copie o nick:', t)
    }
  }

  async function toggleFavorite(target: UserProfile) {
    if (!user || !db || !profile) return
    const pref = userProfileDoc(db, user.uid)
    const snap = await getDoc(pref)
    const cur = snap.exists()
      ? normalizeUserFromFirestore(snap.data(), user.uid)
      : null
    if (!cur) return
    const favs = cur.favoriteUids ?? []
    const isFav = favs.includes(target.uid)
    if (!isFav && !isPremium && favs.length >= FREE_FAVORITES_LIMIT) {
      toast.info(
        `Plano free: até ${FREE_FAVORITES_LIMIT} favoritos. Premium Essencial ou Pro = ilimitados.`,
      )
      return
    }
    const next = isFav
      ? favs.filter((id) => id !== target.uid)
      : [...favs, target.uid]
    await updateDoc(pref, { favoriteUids: next })
    await refreshProfile()
    toast.success(isFav ? 'Removido dos favoritos.' : 'Adicionado aos favoritos.')
  }

  if (firebaseFeedBlockedReason()) {
    return <FirebaseConfigNotice />
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

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
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
              <span className="font-semibold text-white">Planos pagos</span> —{' '}
              <strong className="text-white">Essencial</strong> (filtros + favoritos),{' '}
              <strong className="text-amber-200">Pro</strong> (+ estatísticas e push).{' '}
              <strong className="text-accent">Destaque</strong> avulso (R$ 3 / 1 h ou R$ 5 / 2 h) na
              lista. O núcleo continua <span className="text-primary">grátis</span>.
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
                  viewerUid={user?.uid}
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

    </>
  )
}
