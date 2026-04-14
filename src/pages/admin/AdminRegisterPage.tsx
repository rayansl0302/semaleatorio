import { FirebaseError } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type UserCredential,
} from 'firebase/auth'
import { serverTimestamp, setDoc } from 'firebase/firestore'
import { Eye, EyeOff } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { auth, db } from '../../firebase/config'
import { isMasterAdminEmail } from '../../lib/adminConfig'
import { adminDocRef } from '../../lib/firestoreAdmin'
import { userProfileDoc } from '../../lib/firestoreUserProfile'
import { useAdminStatus } from '../../hooks/useAdminStatus'
import { useState } from 'react'

/**
 * Firebase moderno devolve `auth/invalid-credential` em vez de `user-not-found` / `wrong-password`
 * (anti-enumeração). Para conta nova: login falha → tentamos registo; se o email já existir,
 * `email-already-in-use` indica senha errada ou outro fornecedor.
 */
async function signInOrCreateEmailPassword(
  authNonNull: NonNullable<typeof auth>,
  email: string,
  password: string,
): Promise<UserCredential> {
  try {
    return await signInWithEmailAndPassword(authNonNull, email, password)
  } catch (err) {
    const code = err instanceof FirebaseError ? err.code : ''
    const tryCreate =
      code === 'auth/user-not-found' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/invalid-login-credentials'
    if (!tryCreate) throw err
    try {
      return await createUserWithEmailAndPassword(authNonNull, email, password)
    } catch (e2) {
      if (e2 instanceof FirebaseError && e2.code === 'auth/email-already-in-use') {
        throw err
      }
      throw e2
    }
  }
}

export function AdminRegisterPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdminStatus(user?.uid)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)

  const loading = authLoading || (!!user && adminLoading)

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-slate-500">
        …
      </div>
    )
  }

  if (user && isAdmin) {
    return <Navigate to="/admin/dashboard" replace />
  }

  if (user && !isMasterAdminEmail(user.email)) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const em = email.trim()
    if (!em || !password || password !== confirm) {
      navigate('/', { replace: true })
      return
    }
    if (password.length < 6) {
      navigate('/', { replace: true })
      return
    }

    if (!auth) {
      navigate('/', { replace: true })
      return
    }

    setBusy(true)
    try {
      const cred = isMasterAdminEmail(em)
        ? await signInOrCreateEmailPassword(auth, em, password)
        : await signInWithEmailAndPassword(auth, em, password)
      const uid = cred.user.uid
      const emailFinal = cred.user.email ?? em

      if (!isMasterAdminEmail(emailFinal)) {
        await logout().catch(() => {})
        navigate('/', { replace: true })
        return
      }
      if (!db) {
        navigate('/', { replace: true })
        return
      }

      await setDoc(adminDocRef(db, uid), {
        email: emailFinal,
        role: 'global',
        createdAt: serverTimestamp(),
      })
      await setDoc(userProfileDoc(db, uid), { adminPanelOnly: true }, { merge: true }).catch(
        () => {},
      )
      navigate('/entrar?redirect=/admin/dashboard', { replace: true })
    } catch (err) {
      console.error('[admin register]', err)
      await logout().catch(() => {})
      navigate('/', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  const inputType = showPw ? 'text' : 'password'

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4">
      <Helmet>
        <title>Registo · SemAleatório</title>
      </Helmet>
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl"
      >
        <h1 className="text-lg font-semibold text-white">Registo</h1>
        <label className="mt-6 block text-xs text-slate-500">
          E-mail
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="mt-4 block text-xs text-slate-500">
          Senha
          <div className="relative mt-1">
            <input
              type={inputType}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg py-2 pl-3 pr-10 text-sm text-white"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <label className="mt-4 block text-xs text-slate-500">
          Confirmar senha
          <div className="relative mt-1">
            <input
              type={inputType}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg py-2 pl-3 pr-10 text-sm text-white"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-bold text-black hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? '…' : 'Continuar'}
        </button>
      </form>
    </div>
  )
}
