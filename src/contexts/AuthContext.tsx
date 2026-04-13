import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import {
  get,
  onDisconnect,
  onValue,
  ref as dbRef,
  remove,
  serverTimestamp,
  set,
  update,
} from 'firebase/database'
import { auth, firebaseReady, rtdb } from '../firebase/config'
import {
  initialUserPayloadForRtdb,
  normalizeUserFromRtdb,
  profileSlugIndexRef,
  userProfileRef,
} from '../lib/rtdbUserProfile'
import { profileSlugFromNick } from '../lib/profileSlug'
import type { UserProfile } from '../types/models'

type AuthContextValue = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  /** Projeto Firebase + Realtime Database (URL) configurados. */
  firebaseConfigured: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmailPassword: (email: string, password: string) => Promise<void>
  registerWithEmailPassword: (email: string, password: string) => Promise<void>
  sendPasswordResetEmail: (email: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  /** Atualização otimista do perfil na sessão (ex.: bio enquanto escreves). */
  updateLocalProfile: (patch: Partial<UserProfile>) => void
  persistProfile: (
    uid: string,
    patch: Partial<UserProfile>,
  ) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function omitUndefined(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

function toRtdbPatch(patch: Partial<UserProfile>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue
    if (k === 'lastOnline' || k === 'createdAt' || k === 'boostUntil' || k === 'premiumUntil') {
      const t = v as { toMillis?: () => number } | null
      if (t && typeof t.toMillis === 'function') {
        out[k] = t.toMillis()
      } else if (v === null) {
        out[k] = null
      }
    } else {
      out[k] = v
    }
  }
  return out
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const unsubProfileRef = useRef<null | (() => void)>(null)

  const detachProfileListener = useCallback(() => {
    if (unsubProfileRef.current) {
      unsubProfileRef.current()
      unsubProfileRef.current = null
    }
  }, [])

  const attachProfileListener = useCallback(
    (uid: string) => {
      detachProfileListener()
      if (!rtdb) {
        setProfile(null)
        return
      }
      const database = rtdb
      const pref = userProfileRef(database, uid)
      unsubProfileRef.current = onValue(pref, async (snap) => {
        if (!snap.exists()) {
          const fresh = await get(pref)
          if (!fresh.exists()) {
            setProfile(null)
            return
          }
          const p = normalizeUserFromRtdb(fresh.val(), uid)
          setProfile(p)
          return
        }
        const p = normalizeUserFromRtdb(snap.val(), uid)
        setProfile(p)
        if (p?.profileSlug) {
          await set(profileSlugIndexRef(database, p.profileSlug), { uid })
        }
      })
    },
    [detachProfileListener],
  )

  useEffect(() => {
    return () => detachProfileListener()
  }, [detachProfileListener])

  useEffect(() => {
    if (!auth) {
      setUser(null)
      setProfile(null)
      setLoading(false)
      return
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      detachProfileListener()
      if (!u) {
        setProfile(null)
        setLoading(false)
        return
      }
      if (!rtdb) {
        setProfile(null)
        setLoading(false)
        return
      }
      const pref = userProfileRef(rtdb, u.uid)
      const snap = await get(pref)
      if (!snap.exists()) {
        const nickname = u.displayName?.trim() || 'Invocador'
        const tag = 'BR1'
        const slug = profileSlugFromNick(nickname, tag)
        const base: UserProfile = {
          uid: u.uid,
          nickname,
          tag,
          elo: 'UNRANKED',
          roles: [],
          status: 'LFG',
          bio: '',
          ratingAvg: 0,
          ratingCount: 0,
          lastOnline: null,
          plan: 'free',
          semiAleatorio: false,
          playerTags: [],
          queueTypes: ['duo', 'flex', 'clash'],
          favoriteUids: [],
          boostUntil: null,
          playingNow: false,
          createdAt: null,
          profileSlug: slug,
        }
        await set(pref, initialUserPayloadForRtdb(base))
        await set(profileSlugIndexRef(rtdb, slug), { uid: u.uid })
      }
      attachProfileListener(u.uid)
      setLoading(false)
    })
    return () => unsub()
  }, [attachProfileListener, detachProfileListener])

  useEffect(() => {
    if (!user || !rtdb) return
    const presenceRef = dbRef(rtdb, `presence/${user.uid}`)
    const connectedRef = dbRef(rtdb, '.info/connected')
    const unsub = onValue(connectedRef, (snap) => {
      if (snap.val() !== true) return
      void onDisconnect(presenceRef).remove()
      void set(presenceRef, { state: 'online', lastChanged: serverTimestamp() })
    })
    return () => {
      unsub()
      void remove(presenceRef)
    }
  }, [user])

  useEffect(() => {
    if (!user || !rtdb) return
    const pref = userProfileRef(rtdb, user.uid)
    const iv = window.setInterval(() => {
      void update(pref, { lastOnline: serverTimestamp() })
    }, 60_000)
    return () => window.clearInterval(iv)
  }, [user])

  const updateLocalProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error('Firebase Auth não configurado.')
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }, [])

  const signInWithEmailPassword = useCallback(
    async (email: string, password: string) => {
      if (!auth) throw new Error('Firebase Auth não configurado.')
      await signInWithEmailAndPassword(auth, email, password)
    },
    [],
  )

  const registerWithEmailPassword = useCallback(
    async (email: string, password: string) => {
      if (!auth) throw new Error('Firebase Auth não configurado.')
      await createUserWithEmailAndPassword(auth, email, password)
    },
    [],
  )

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    if (!auth) throw new Error('Firebase Auth não configurado.')
    await firebaseSendPasswordResetEmail(auth, email)
  }, [])

  const logout = useCallback(async () => {
    if (!auth) return
    await signOut(auth)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user || !rtdb) return
    const snap = await get(userProfileRef(rtdb, user.uid))
    if (!snap.exists()) {
      setProfile(null)
      return
    }
    setProfile(normalizeUserFromRtdb(snap.val(), user.uid))
  }, [user])

  const persistProfile = useCallback(
    async (uid: string, patch: Partial<UserProfile>) => {
      if (!rtdb) {
        throw new Error('Realtime Database não configurada (VITE_FIREBASE_DATABASE_URL).')
      }
      const pref = userProfileRef(rtdb, uid)
      const snap = await get(pref)
      const current = snap.exists()
        ? normalizeUserFromRtdb(snap.val(), uid)
        : null
      const rtdbPatch = toRtdbPatch(patch)
      const merged = current
        ? { ...current, ...patch }
        : ({ uid, ...patch } as UserProfile)
      const nextSlug =
        typeof merged.profileSlug === 'string' && merged.profileSlug.trim() !== ''
          ? merged.profileSlug.trim()
          : profileSlugFromNick(merged.nickname, merged.tag)

      const prevSlug = current?.profileSlug
      await update(
        pref,
        omitUndefined({
          ...rtdbPatch,
          profileSlug: nextSlug,
          lastOnline: serverTimestamp(),
        }),
      )
      if (prevSlug && prevSlug !== nextSlug) {
        await remove(profileSlugIndexRef(rtdb, prevSlug))
      }
      await set(profileSlugIndexRef(rtdb, nextSlug), { uid })
    },
    [],
  )

  const firebaseConfigured = firebaseReady && rtdb !== null

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      firebaseConfigured,
      signInWithGoogle,
      signInWithEmailPassword,
      registerWithEmailPassword,
      sendPasswordResetEmail,
      logout,
      refreshProfile,
      updateLocalProfile,
      persistProfile,
    }),
    [
      user,
      profile,
      loading,
      firebaseConfigured,
      signInWithGoogle,
      signInWithEmailPassword,
      registerWithEmailPassword,
      sendPasswordResetEmail,
      logout,
      refreshProfile,
      updateLocalProfile,
      persistProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
