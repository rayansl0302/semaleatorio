import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'
import { useAuth } from '../contexts/AuthContext'
import { useFcmRegistration } from '../hooks/useFcmRegistration'

const navCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
  }`

export function Layout() {
  const location = useLocation()
  const { user, firebaseConfigured, logout } = useAuth()
  useFcmRegistration(user)

  const entrarHref = `/entrar?redirect=${encodeURIComponent(
    `${location.pathname}${location.search}` || '/app',
  )}`

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-slate-200">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-1 sm:py-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <Link
              to="/app"
              className="block shrink-0 rounded-md p-0 leading-none ring-offset-2 ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <BrandLogo
                variant="text"
                className="leading-none"
                imgClassName="h-[4.25rem] w-auto max-w-[min(100vw-8rem,26rem)] object-left sm:h-[5rem] md:h-[5.5rem] lg:h-24"
                loading="eager"
              />
            </Link>
            <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/app" className={navCls} end>
              Início
            </NavLink>
            <NavLink to="/app/jogadores" className={navCls}>
              Jogadores
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
                  Perfil
                </NavLink>
                <NavLink to="/app/mensagens" className={navCls}>
                  Mensagens
                </NavLink>
              </>
            )}
            {!firebaseConfigured ? (
              <span className="px-2 text-xs text-amber-400">Firebase off</span>
            ) : user ? (
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                Sair
              </button>
            ) : (
              <Link
                to={entrarHref}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-black hover:bg-primary/90"
              >
                Entrar
              </Link>
            )}
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-slate-600">
        SemAleatório — comunidade brasileira · não afiliado à Riot Games
      </footer>
    </div>
  )
}
