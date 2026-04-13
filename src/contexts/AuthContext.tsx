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
  deleteField,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { auth, db, firebaseReady } from '../firebase/config'
import {
  initialUserFirestorePayload,
  normalizeUserFromFirestore,
  profileSlugIndexDoc,
  userProfileDoc,
} from '../lib/firestoreUserProfile'
import { detectDefaultRegion } from '../lib/detectRegion'
import { profileSlugFromNick } from '../lib/profileSlug'
import type { UserProfile } from '../types/models'

type AuthContextValue = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  firebaseConfigured: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmailPassword: (email: string, password: string) => Promise<void>
  registerWithEmailPassword: (email: string, password: string) => Promise<void>
  sendPasswordResetEmail: (email: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateLocalProfile: (patch: Partial<UserProfile>) => void
  persistProfile: (uid: string, patch: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function omitUndefined(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

function toFirestoreUpdate(patch: Partial<UserProfile>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue
    if (
      k === 'lastOnline' ||
      k === 'createdAt' ||
      k === 'boostUntil' ||
      k === 'premiumUntil'
    ) {
      const t = v as { toMillis?: () => number } | null
      if (v === null) out[k] = deleteField()
      else if (t && typeof t.toMillis === 'function') out[k] = v
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
      if (!db) {
        setProfile(null)
        return
      }
      const pref = userProfileDoc(db, uid)
      const unsub = onSnapshot(
        pref,
        (snap) => {
          if (!snap.exists()) {
            setProfile(null)
            return
          }
          const p = normalizeUserFromFirestore(snap.data(), uid)
          setProfile(p)
        },
        () => setProfile(null),
      )
      unsubProfileRef.current = unsub
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
      if (!u || !db) {
        setProfile(null)
        setLoading(false)
        return
      }

      const pref = userProfileDoc(db, u.uid)
      const snap = await getDoc(pref)
      attachProfileListener(u.uid)

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
          region: detectDefaultRegion(),
        }
        await setDoc(pref, initialUserFirestorePayload(base))
        await setDoc(profileSlugIndexDoc(db, slug), { uid: u.uid })
      }

      setLoading(false)
    })
    return () => unsub()
  }, [attachProfileListener, detachProfileListener])

  useEffect(() => {
    if (!user || !db) return
    const pref = userProfileDoc(db, user.uid)
    const iv = window.setInterval(() => {
      void updateDoc(pref, { lastOnline: serverTimestamp() }).catch(() => {})
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
    if (!user || !db) return
    const snap = await getDoc(userProfileDoc(db, user.uid))
    if (!snap.exists()) {
      setProfile(null)
      return
    }
    setProfile(normalizeUserFromFirestore(snap.data(), user.uid))
  }, [user])

  const persistProfile = useCallback(async (uid: string, patch: Partial<UserProfile>) => {
    if (!db) {
      throw new Error('Firestore não configurado.')
    }
    const pref = userProfileDoc(db, uid)
    const snap = await getDoc(pref)
    const current = snap.exists()
      ? normalizeUserFromFirestore(snap.data(), uid)
      : null
    const fsPatch = toFirestoreUpdate(patch)
    const merged = current
      ? { ...current, ...patch }
      : ({ uid, ...patch } as UserProfile)
    const nextSlug =
      typeof merged.profileSlug === 'string' && merged.profileSlug.trim() !== ''
        ? merged.profileSlug.trim()
        : profileSlugFromNick(merged.nickname, merged.tag)

    const prevSlug = current?.profileSlug
    if (nextSlug !== prevSlug) {
      const idxRef = profileSlugIndexDoc(db, nextSlug)
      const idxSnap = await getDoc(idxRef)
      if (idxSnap.exists()) {
        const d = idxSnap.data() as { uid?: string }
        if (d?.uid && d.uid !== uid) {
          throw new Error(
            'Este endereço público (/u/…) já está em uso. Escolha outro nick ou tag.',
          )
        }
      }
    }

    const batch = writeBatch(db)
    batch.update(
      pref,
      omitUndefined({
        ...fsPatch,
        profileSlug: nextSlug,
        lastOnline: serverTimestamp(),
      }) as Record<string, unknown>,
    )
    if (prevSlug && prevSlug !== nextSlug) {
      batch.delete(profileSlugIndexDoc(db, prevSlug))
    }
    batch.set(profileSlugIndexDoc(db, nextSlug), { uid })
    await batch.commit()
  }, [])

  const firebaseConfigured = firebaseReady && db !== null

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
