import { arrayUnion, doc, setDoc } from 'firebase/firestore'
import { useEffect, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../firebase/config'
import { useAdminStatus } from '../../hooks/useAdminStatus'
import { userProfileDoc } from '../../lib/firestoreUserProfile'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdminStatus(user?.uid)
  const location = useLocation()
  const loading = authLoading || (!!user && adminLoading)
  const syncedPanelFlag = useRef(false)

  useEffect(() => {
    if (!db || !user?.uid || !isAdmin || syncedPanelFlag.current) return
    const fs = db
    const uid = user.uid
    syncedPanelFlag.current = true
    void setDoc(userProfileDoc(fs, uid), { adminPanelOnly: true }, { merge: true })
      .then(() =>
        setDoc(doc(fs, 'config', 'staff_players_hide'), { uids: arrayUnion(uid) }, { merge: true }),
      )
      .catch(() => {
        syncedPanelFlag.current = false
      })
  }, [user?.uid, isAdmin])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-slate-500">
        A verificar permissões…
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to={`/entrar?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
