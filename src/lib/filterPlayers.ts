import { eloRank } from './constants'
import type { FilterState } from '../components/SidebarFilters'
import type { UserProfile } from '../types/models'

function matchesEloRange(elo: string, min: string, max: string): boolean {
  const r = eloRank(elo)
  if (min !== 'ANY' && r < eloRank(min)) return false
  if (max !== 'ANY' && r > eloRank(max)) return false
  return true
}

export function filterPlayers(
  list: UserProfile[],
  f: FilterState,
  options: { eloMaxEnabled: boolean },
): UserProfile[] {
  const q = f.search.trim().toLowerCase()
  return list.filter((p) => {
    if (q) {
      const hay = `${p.nickname}#${p.tag}`.toLowerCase()
      if (!hay.includes(q.replace(/\s/g, ''))) return false
    }
    if (f.statusLfgOnly && p.status !== 'LFG') return false
    if (f.role !== 'ANY' && !p.roles?.includes(f.role)) return false
    if (f.queueType && !p.queueTypes?.includes(f.queueType)) return false
    if (!matchesEloRange(p.elo, f.eloMin, 'ANY')) return false
    if (options.eloMaxEnabled && f.eloMax !== 'ANY') {
      if (!matchesEloRange(p.elo, 'ANY', f.eloMax)) return false
    }
    return true
  })
}
