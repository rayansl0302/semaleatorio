import { LolEloIcon, LolRoleIcon } from './LolIcons'
import type { UserProfile } from '../types/models'

type Props = {
  player: UserProfile | null
  open: boolean
  onClose: () => void
  onCopy: () => void
}

export function CallModal({ player, open, onClose, onCopy }: Props) {
  if (!open || !player) return null
  const full = `${player.nickname}#${player.tag}`

  function openRiot() {
    window.location.href = 'riotclient://'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="call-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 id="call-title" className="text-lg font-semibold text-white">
          Jogar com {player.nickname}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          O fluxo principal no BR é copiar o nick e adicionar no cliente do LoL. O
          chat do site é opcional e fica em segundo plano.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1">
            <LolEloIcon elo={player.elo} className="h-6 w-6" />
            {player.elo}
          </span>
          {player.roles?.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-xs"
            >
              <LolRoleIcon role={r} className="h-4 w-4" />
              {r}
            </span>
          ))}
        </div>
        <p className="mt-4 rounded-lg bg-bg px-3 py-2 font-mono text-primary">{full}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onCopy()
              onClose()
            }}
            className="rounded-lg bg-primary py-2.5 text-sm font-semibold text-black"
          >
            Copiar nick e fechar
          </button>
          <button
            type="button"
            onClick={() => {
              void openRiot()
            }}
            className="rounded-lg border border-secondary/50 bg-secondary/10 py-2.5 text-sm font-semibold text-blue-200 hover:bg-secondary/20"
          >
            Abrir Riot Client
          </button>
          <p className="text-center text-xs text-slate-600">
            Se o botão acima não abrir, inicie o Riot Client manualmente e cole o
            nick em &quot;Adicionar amigo&quot;.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="py-2 text-sm text-slate-500 hover:text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
