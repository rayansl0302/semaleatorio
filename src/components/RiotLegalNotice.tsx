/**
 * Texto exigido pela política de desenvolvedores Riot (visível aos jogadores).
 * @see https://developer.riotgames.com/docs/lol (Game Policy)
 */
export function RiotLegalNotice({ className = '' }: { className?: string }) {
  return (
    <p
      className={`text-[10px] leading-relaxed text-slate-500 sm:text-xs ${className}`.trim()}
    >
      SemAleatório is not endorsed by Riot Games and does not reflect the views or opinions
      of Riot Games or anyone officially involved in producing or managing Riot Games
      properties. Riot Games and all associated properties are trademarks or registered
      trademarks of Riot Games, Inc.
    </p>
  )
}
