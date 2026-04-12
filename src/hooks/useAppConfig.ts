import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase/config'

export type AppPublicConfig = {
  /** Piso para texto de presença (meta social); não altera dados reais */
  onlineCountFloor: number
}

const DEFAULTS: AppPublicConfig = {
  onlineCountFloor: 12,
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppPublicConfig>(DEFAULTS)

  useEffect(() => {
    if (!db) return
    const ref = doc(db, 'config', 'app')
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setConfig(DEFAULTS)
          return
        }
        const d = snap.data() as Partial<AppPublicConfig>
        setConfig({
          onlineCountFloor:
            typeof d.onlineCountFloor === 'number'
              ? d.onlineCountFloor
              : DEFAULTS.onlineCountFloor,
        })
      },
      () => setConfig(DEFAULTS),
    )
  }, [])

  return config
}
