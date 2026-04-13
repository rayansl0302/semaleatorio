import { onValue, ref } from 'firebase/database'
import { useEffect, useState } from 'react'
import { rtdb } from '../firebase/config'

export type AppPublicConfig = {
  onlineCountFloor: number
}

const DEFAULTS: AppPublicConfig = {
  onlineCountFloor: 12,
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppPublicConfig>(DEFAULTS)

  useEffect(() => {
    if (!rtdb) return
    const r = ref(rtdb, 'config/app')
    return onValue(
      r,
      (snap) => {
        if (!snap.exists()) {
          setConfig(DEFAULTS)
          return
        }
        const d = snap.val() as Partial<AppPublicConfig>
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
