import { FirebaseError } from 'firebase/app'
import { Helmet } from 'react-helmet-async'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  BrandLogo,
  BRAND_LOGO_TEXT_COMPACT_HEADER_IMG_CLASS,
} from '../components/BrandLogo'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { LogIn, Sparkles, UserPlus } from '../lib/icons'
import { missingFirebaseViteEnvVars } from '../firebase/config'
import { useRecaptchaV2Widget } from '../hooks/useRecaptchaV2Widget'
import { isBackendConfigured } from '../lib/asaasPublic'
import { verifyRecaptchaWithBackend } from '../lib/recaptchaVerifyBackend'
import {
  clearAuthAttemptFailures,
  formatRetryWaitPt,
  getAuthAttemptBlock,
  getPasswordResetBlock,
  recordAuthAttemptFailure,
  recordPasswordResetSent,
  shouldCountAuthFailure,
} from '../lib/clientAuthThrottle'
import { authErrorMessage } from '../lib/authErrors'

type Mode = 'login' | 'register'

function safeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/app'
  return raw
}

export function AuthPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const redirect = useMemo(() => safeRedirect(params.get('redirect')), [params])

  const {
    user,
    firebaseConfigured,
    signInWithGoogle,
    signInWithEmailPassword,
    registerWithEmailPassword,
    sendPasswordResetEmail,
  } = useAuth()
  const toast = useToast()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const missingFirebaseKeys = missingFirebaseViteEnvVars()

  const recaptchaSiteKey = useMemo(
    () => import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim() ?? '',
    [],
  )
  const { containerRef, getResponse, reset: resetRecaptcha, enabled: recaptchaUiEnabled, scriptError } =
    useRecaptchaV2Widget(recaptchaSiteKey || undefined)

  useEffect(() => {
    if (user) navigate(redirect, { replace: true })
  }, [user, navigate, redirect])

  useEffect(() => {
    if (recaptchaSiteKey) resetRecaptcha()
  }, [mode, recaptchaSiteKey, resetRecaptcha])

  async function ensureRecaptchaVerified(): Promise<void> {
    if (!recaptchaSiteKey) return
    if (!isBackendConfigured()) {
      throw new Error(
        'reCAPTCHA configurado: defina também VITE_BACKEND_URL e RECAPTCHA_SECRET_KEY no servidor.',
      )
    }
    const t = getResponse()
    if (!t) {
      throw new Error('Marque a caixa «Não sou um robô» antes de continuar.')
    }
    await verifyRecaptchaWithBackend(t)
  }

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResetSent(false)
    const block = getAuthAttemptBlock()
    if (block.blocked) {
      setError(
        `Muitas tentativas neste dispositivo. Aguarde ${formatRetryWaitPt(block.retryAfterMs)} e tente de novo.`,
      )
      return
    }
    const em = email.trim()
    if (!em) {
      setError('Informe o e-mail.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (mode === 'register' && password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    try {
      await ensureRecaptchaVerified()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirme o reCAPTCHA.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        await signInWithEmailPassword(em, password)
      } else {
        await registerWithEmailPassword(em, password)
      }
      clearAuthAttemptFailures()
      navigate(redirect, { replace: true })
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : undefined
      if (shouldCountAuthFailure(code)) {
        recordAuthAttemptFailure()
      }
      setError(authErrorMessage(code, mode === 'register' ? 'register' : 'login'))
      if (recaptchaSiteKey) resetRecaptcha()
    } finally {
      setLoading(false)
    }
  }

  async function onGoogle() {
    setError(null)
    setResetSent(false)
    const block = getAuthAttemptBlock()
    if (block.blocked) {
      setError(
        `Muitas tentativas neste dispositivo. Aguarde ${formatRetryWaitPt(block.retryAfterMs)} e tente de novo.`,
      )
      return
    }
    try {
      await ensureRecaptchaVerified()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirme o reCAPTCHA.')
      return
    }
    setLoading(true)
    try {
      await signInWithGoogle()
      clearAuthAttemptFailures()
      navigate(redirect, { replace: true })
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : undefined
      if (shouldCountAuthFailure(code)) {
        recordAuthAttemptFailure()
      }
      setError(authErrorMessage(code, 'login'))
      if (recaptchaSiteKey) resetRecaptcha()
    } finally {
      setLoading(false)
    }
  }

  async function onForgotPassword() {
    setError(null)
    setResetSent(false)
    const prBlock = getPasswordResetBlock()
    if (prBlock.blocked) {
      setError(
        `Limite de pedidos de recuperação neste dispositivo. Aguarde ${formatRetryWaitPt(prBlock.retryAfterMs)}.`,
      )
      return
    }
    const em = email.trim()
    if (!em) {
      setError('Digite seu e-mail acima e clique em “Esqueci a senha”.')
      return
    }
    try {
      await ensureRecaptchaVerified()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirme o reCAPTCHA.')
      return
    }
    setLoading(true)
    try {
      await sendPasswordResetEmail(em)
      recordPasswordResetSent()
      setResetSent(true)
      toast.success('Se o e-mail existir na conta, enviamos o link de recuperação.')
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : undefined
      setError(authErrorMessage(code, 'login'))
      if (recaptchaSiteKey) resetRecaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Entrar — SemAleatório</title>
        <meta
          name="description"
          content="Faça login ou crie conta no SemAleatório com Google ou e-mail e senha."
        />
      </Helmet>

      <div className="flex min-h-dvh flex-col bg-bg text-slate-200">
        <header className="border-b border-border bg-bg/95 px-4 py-2 backdrop-blur sm:py-2.5">
          <div className="mx-auto flex max-w-md items-center">
            <Link
              to="/"
              className="block rounded-md p-0 leading-none ring-offset-2 ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <BrandLogo
                variant="text"
                className="leading-none"
                imgClassName={BRAND_LOGO_TEXT_COMPACT_HEADER_IMG_CLASS}
                loading="eager"
              />
            </Link>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
          <h1 className="text-center text-xl font-bold text-white sm:text-2xl">
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </h1>
          <p className="mt-2 text-center text-sm text-slate-500">
            Duo, flex e Clash BR — com ou sem Google.
          </p>

          {!firebaseConfigured ? (
            <div className="mt-8 space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <p className="text-center font-medium text-amber-100">
                Firebase (app Web) não está ativo no front-end.
              </p>
              <p className="text-center text-amber-200/90">
                No arquivo <code className="rounded bg-black/30 px-1 text-xs">.env</code> na{' '}
                <strong className="text-amber-100">raiz do projeto</strong>, defina as variáveis com prefixo{' '}
                <code className="text-xs">VITE_</code> — copie do Console do Firebase → Configurações do
                projeto → Seu app → SDK de configuração (não use o JSON da conta de serviço
                aqui).
              </p>
              {missingFirebaseKeys.length > 0 ? (
                <div className="rounded-lg border border-amber-500/20 bg-black/20 px-3 py-2">
                  <p className="mb-2 text-xs font-medium text-amber-100/90">
                    Ausentes ou vazias ({missingFirebaseKeys.length}):
                  </p>
                  <ul className="list-inside list-disc space-y-0.5 font-mono text-xs text-amber-100/80">
                    {missingFirebaseKeys.map((k) => (
                      <li key={k}>{k}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="text-center text-xs text-amber-200/70">
                Depois de guardar o <code className="text-[0.65rem]">.env</code>, reinicia o{' '}
                <code className="text-[0.65rem]">npm run dev</code>.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-8 flex rounded-xl border border-border bg-card p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError(null)
                    setResetSent(false)
                  }}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
                    mode === 'login'
                      ? 'bg-white/10 text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register')
                    setError(null)
                    setResetSent(false)
                  }}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
                    mode === 'register'
                      ? 'bg-white/10 text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Cadastrar
                </button>
              </div>

              <form className="mt-6 space-y-4" onSubmit={(e) => void onEmailSubmit(e)}>
                <div>
                  <label htmlFor="auth-email" className="sr-only">
                    E-mail
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-mail"
                    className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label htmlFor="auth-password" className="sr-only">
                    Senha
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha (mín. 6 caracteres)"
                    className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                {mode === 'register' ? (
                  <div>
                    <label htmlFor="auth-confirm" className="sr-only">
                      Confirmar senha
                    </label>
                    <input
                      id="auth-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Confirmar senha"
                      className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                ) : null}

                {error ? (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </p>
                ) : null}
                {resetSent ? (
                  <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
                    Enviamos um e-mail com o link para redefinir a senha.
                  </p>
                ) : null}

                {recaptchaUiEnabled ? (
                  <div className="space-y-2">
                    <div ref={containerRef} className="flex justify-center overflow-x-auto" />
                    {scriptError ? (
                      <p className="text-center text-xs text-amber-200">{scriptError}</p>
                    ) : null}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-black transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? (
                    'Aguarde…'
                  ) : mode === 'login' ? (
                    <>
                      <LogIn className="h-4 w-4 shrink-0" aria-hidden />
                      Entrar com e-mail
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                      Criar conta
                    </>
                  )}
                </button>
              </form>

              {mode === 'login' ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void onForgotPassword()}
                  className="mt-3 w-full text-center text-sm text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline disabled:opacity-60"
                >
                  Esqueci a senha
                </button>
              ) : null}

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wider">
                  <span className="bg-bg px-3 text-slate-500">ou</span>
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => void onGoogle()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-amber-300/90" aria-hidden />
                Continuar com Google
              </button>
            </>
          )}

          <p className="mt-10 text-center text-xs text-slate-600">
            Ao continuar, você concorda com o uso da plataforma conforme as regras da comunidade.
          </p>
        </main>
      </div>
    </>
  )
}
