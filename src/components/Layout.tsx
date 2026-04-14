import type { ReactNode } from 'react'
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { BrandLogo, BRAND_LOGO_TEXT_HEADER_IMG_CLASS } from './BrandLogo'
import { PlayersMessagesDock } from './PlayersMessagesDock'
import { RiotLegalNotice } from './RiotLegalNotice'
import { ChatFocusProvider } from '../contexts/ChatFocusContext'
import { MessageThreadsProvider, useMessageThreadsContext } from '../contexts/MessageThreadsContext'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase/config'
import { useToast } from '../contexts/ToastContext'
import { useFcmRegistration } from '../hooks/useFcmRegistration'
import { Home, LogOut, MessageCircle, User, Users } from '../lib/icons'

const navCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
  }`

function NavIcon({ children }: { children: ReactNode }) {
  return <span className="inline-flex shrink-0 [&_svg]:h-4 [&_svg]:w-4">{children}</span>
}

function MessagesNavLink() {
  const { unreadCount } = useMessageThreadsContext()
  return (
    <NavLink to="/app/mensagens" className={navCls}>
      <span className="relative inline-flex items-center gap-1.5">
        <NavIcon>
          <MessageCircle aria-hidden />
        </NavIcon>
        Mensagens
        {unreadCount > 0 ? (
          <span
            className="min-w-[1.125rem] rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-5 text-black"
            aria-label={`${unreadCount} conversa(s) com mensagem não lida`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </span>
    </NavLink>
  )
}

function LayoutInner() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, loading, firebaseConfigured, logout } = useAuth()
  const toast = useToast()
  useFcmRegistration(user, profile)

  const entrarHref = `/entrar?redirect=${encodeURIComponent(
    `${location.pathname}${location.search}` || '/app',
  )}`

  if (firebaseConfigured && loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-slate-400">
        Carregando…
      </div>
    )
  }
  if (firebaseConfigured && !user) {
    return <Navigate to={entrarHref} replace />
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-slate-200">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:gap-x-4">
            <Link
              to="/app"
              className="block shrink-0 rounded-md p-0 leading-none ring-offset-2 ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <BrandLogo
                variant="text"
                className="leading-none"
                imgClassName={BRAND_LOGO_TEXT_HEADER_IMG_CLASS}
                loading="eager"
              />
            </Link>
            <nav className="flex flex-wrap items-center gap-1">
              <NavLink to="/app" className={navCls} end>
                <span className="inline-flex items-center gap-1.5">
                  <NavIcon>
                    <Home aria-hidden />
                  </NavIcon>
                  Início
                </span>
              </NavLink>
              <NavLink to="/app/jogadores" className={navCls}>
                <span className="inline-flex items-center gap-1.5">
                  <NavIcon>
                    <Users aria-hidden />
                  </NavIcon>
                  Jogadores
                </span>
              </NavLink>
              {!user && (
                <Link
                  to="/"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:text-white"
                >
                  Site
                </Link>
              )}
              {user && (
                <>
                  <NavLink to="/app/perfil" className={navCls}>
                    <span className="inline-flex items-center gap-1.5">
                      <NavIcon>
                        <User aria-hidden />
                      </NavIcon>
                      Perfil
                    </span>
                  </NavLink>
                  <MessagesNavLink />
                </>
              )}
              {!firebaseConfigured ? (
                <>
                  <span className="px-2 text-xs text-amber-400">Firebase off</span>
                  <Link
                    to={entrarHref}
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-black hover:bg-primary/90"
                  >
                    Entrar
                  </Link>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void logout().then(() => {
                      toast.success('Sessão encerrada.')
                      navigate('/', { replace: true })
                    })
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <LogOut className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  Sair
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main
        className={`mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 ${user && db ? 'pb-24 sm:pb-10' : ''}`}
      >
        <Outlet />
      </main>
      {user && db ? <PlayersMessagesDock /> : null}
      <footer className="space-y-3 border-t border-border py-6 text-center text-xs text-slate-600">
        <p>SemAleatório — comunidade brasileira</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-slate-500">
          <Link to="/privacidade" className="hover:text-slate-300 hover:underline">
            Política de Privacidade
          </Link>
          <span aria-hidden className="text-slate-700">
            ·
          </span>
          <Link to="/termos" className="hover:text-slate-300 hover:underline">
            Termos de Serviço
          </Link>
        </nav>
        <div className="mx-auto max-w-2xl px-4">
          <RiotLegalNotice />
        </div>
      </footer>
    </div>
  )
}

export function Layout() {
  return (
    <ChatFocusProvider>
      <MessageThreadsProvider>
        <LayoutInner />
      </MessageThreadsProvider>
    </ChatFocusProvider>
  )
}
