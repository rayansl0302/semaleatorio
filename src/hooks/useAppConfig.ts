import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase/config'

export type AppConfigState = {
  onlineCountFloor: number
}

const DEFAULTS: AppConfigState = {
  onlineCountFloor: 0,
}

export function useAppConfig(): AppConfigState {
  const [cfg, setCfg] = useState<AppConfigState>(DEFAULTS)

  useEffect(() => {
    if (!db) return
    const r = doc(db, 'config', 'app')
    return onSnapshot(
      r,
      (snap) => {
        if (!snap.exists()) {
          setCfg(DEFAULTS)
          return
        }
        const d = snap.data() as Record<string, unknown>
        const floor = Number(d.onlineCountFloor ?? 0)
        setCfg({
          onlineCountFloor: Number.isFinite(floor) ? Math.max(0, floor) : 0,
        })
      },
      () => setCfg(DEFAULTS),
    )
  }, [])

  return cfg
}
