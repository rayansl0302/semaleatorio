import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase/config'
import { adminDocRef, type AdminDoc } from '../lib/firestoreAdmin'

export function useAdminStatus(uid: string | undefined | null) {
  const [admin, setAdmin] = useState<AdminDoc | null>(null)
  const [loading, setLoading] = useState(!!uid)

  useEffect(() => {
    if (!db || !uid) {
      setAdmin(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const ref = adminDocRef(db, uid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setAdmin(null)
        } else {
          const d = snap.data() as AdminDoc
          setAdmin(d)
        }
        setLoading(false)
      },
      () => {
        setAdmin(null)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [uid])

  return { isAdmin: admin != null && admin.role === 'global', admin, loading }
}
