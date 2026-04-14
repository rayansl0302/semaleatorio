import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LayoutDashboard, LogOut, Users, Wallet } from 'lucide-react'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
      : 'text-slate-400 hover:bg-white/5 hover:text-white'
  }`

export function AdminLayout() {
  const { logout } = useAuth()

  return (
    <div className="flex min-h-dvh bg-bg text-slate-100">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card/90">
        <div className="border-b border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Admin</p>
          <p className="mt-1 text-sm font-bold text-white">SemAleatório</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          <NavLink to="/admin/dashboard" className={navClass} end>
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Visão geral
          </NavLink>
          <NavLink to="/admin/users" className={navClass}>
            <Users className="h-4 w-4 shrink-0" />
            Utilizadores
          </NavLink>
          <NavLink to="/admin/payments" className={navClass}>
            <Wallet className="h-4 w-4 shrink-0" />
            Pagamentos
          </NavLink>
        </nav>
        <div className="border-t border-border p-2">
          <NavLink
            to="/app"
            className="mb-1 block rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-white/5 hover:text-slate-300"
          >
            ← Voltar ao app
          </NavLink>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
