import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
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
import { auth, db, firebaseReady } from '../firebase/config'
import { detectDefaultRegion } from '../lib/detectRegion'
import { profileSlugFromNick } from '../lib/profileSlug'
import type { Plan, PlayerStatus, QueueType, UserProfile } from '../types/models'

type AuthState = {
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
  updateLocalProfile: (p: Partial<UserProfile>) => void
}

const AuthContext = createContext<AuthState | null>(null)

function isFirestoreOfflineError(e: unknown): boolean {
  if (e instanceof FirebaseError) {
    if (e.code === 'unavailable') return true
    if (e.message?.toLowerCase().includes('offline')) return true
  }
  if (e instanceof Error && e.message.toLowerCase().includes('offline')) {
    return true
  }
  return false
}

const defaultProfile = (uid: string, email: string | null): UserProfile => {
  const nickname = email?.split('@')[0] ?? 'Invocador'
  const tag = 'BR1'
  return {
    uid,
    nickname,
    tag,
    elo: 'UNRANKED',
    roles: [],
    status: 'LFG' as PlayerStatus,
    bio: '',
    ratingAvg: 0,
    ratingCount: 0,
    lastOnline: null,
    plan: 'free' as Plan,
    semiAleatorio: false,
    playerTags: [],
    queueTypes: ['duo', 'flex', 'clash'] as QueueType[],
    favoriteUids: [],
    boostUntil: null,
    playingNow: false,
    region: detectDefaultRegion(),
    profileSlug: profileSlugFromNick(nickname, tag),
    shadowBanned: false,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(firebaseReady)
  const firestoreOfflineLogged = useRef(false)

  const loadProfile = useCallback(async (u: User) => {
    if (!db) {
      setProfile(defaultProfile(u.uid, u.email))
      return
    }
    try {
      const ref = doc(db, 'users', u.uid)
      const snap = await getDoc(ref)

      if (!snap.exists()) {
        const base = defaultProfile(u.uid, u.email)
        setProfile(base)
        void setDoc(ref, {
          ...base,
          lastOnline: serverTimestamp(),
          createdAt: serverTimestamp(),
        }).catch((createErr) => {
          if (!isFirestoreOfflineError(createErr)) {
            console.error('[Auth] setDoc user:', createErr)
          }
        })
      } else {
        const data = snap.data() as UserProfile
        const slug =
          data.profileSlug ||
          profileSlugFromNick(data.nickname ?? '', data.tag ?? 'BR1')
        setProfile({ ...data, profileSlug: slug })
        if (!data.profileSlug && data.nickname) {
          void updateDoc(ref, { profileSlug: slug }).catch(() => {})
        }
      }
    } catch (e) {
      if (isFirestoreOfflineError(e)) {
        if (!firestoreOfflineLogged.current) {
          firestoreOfflineLogged.current = true
          console.warn(
            '[Auth] Firestore sem rede: a usar dados mínimos até a ligação voltar.',
          )
        }
      } else {
        console.error('[Auth] loadProfile:', e)
      }
      setProfile(defaultProfile(u.uid, u.email))
    }
  }, [])

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setLoading(false)
      return
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (!u) {
        setProfile(null)
        setLoading(false)
        return
      }
      // Perfil otimista: UI deixa de bloquear em “Carregando…” à espera só do Firestore.
      setProfile(defaultProfile(u.uid, u.email))
      setLoading(false)
      void loadProfile(u)
    })
  }, [loadProfile])

  useEffect(() => {
    if (!firebaseReady || !db || !user) return
    const onOnline = () => {
      void loadProfile(user)
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [user, db, loadProfile])

  useEffect(() => {
    if (!user || !db) return
    const ref = doc(db, 'users', user.uid)
    const pulse = () => {
      void setDoc(ref, { lastOnline: serverTimestamp() }, { merge: true }).catch(
        () => {},
      )
    }
    const t = window.setTimeout(pulse, 800)
    const id = window.setInterval(pulse, 120_000)
    return () => {
      window.clearTimeout(t)
      window.clearInterval(id)
    }
  }, [user])

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error('Firebase Auth indisponível.')
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }, [])

  const signInWithEmailPassword = useCallback(
    async (email: string, password: string) => {
      if (!auth) throw new Error('Firebase Auth indisponível.')
      await signInWithEmailAndPassword(auth, email, password)
    },
    [],
  )

  const registerWithEmailPassword = useCallback(
    async (email: string, password: string) => {
      if (!auth) throw new Error('Firebase Auth indisponível.')
      await createUserWithEmailAndPassword(auth, email, password)
    },
    [],
  )

  const sendPasswordResetEmailFn = useCallback(async (email: string) => {
    if (!auth) throw new Error('Firebase Auth indisponível.')
    await sendPasswordResetEmail(auth, email)
  }, [])

  const logout = useCallback(async () => {
    if (!auth) return
    await signOut(auth)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user && db) await loadProfile(user)
  }, [user, loadProfile])

  const updateLocalProfile = useCallback((p: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...p } : prev))
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      firebaseConfigured: firebaseReady,
      signInWithGoogle,
      signInWithEmailPassword,
      registerWithEmailPassword,
      sendPasswordResetEmail: sendPasswordResetEmailFn,
      logout,
      refreshProfile,
      updateLocalProfile,
    }),
    [
      user,
      profile,
      loading,
      signInWithGoogle,
      signInWithEmailPassword,
      registerWithEmailPassword,
      sendPasswordResetEmailFn,
      logout,
      refreshProfile,
      updateLocalProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth dentro de AuthProvider')
  return ctx
}

export async function persistProfile(uid: string, data: Record<string, unknown>) {
  if (!db) return
  const ref = doc(db, 'users', uid)
  await updateDoc(ref, { ...data, lastOnline: serverTimestamp() })
}
