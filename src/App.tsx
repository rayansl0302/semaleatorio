import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthPage } from './pages/AuthPage'
import { FeedHomePage } from './pages/FeedHomePage'
import { PlayersPage } from './pages/PlayersPage'
import { LandingPage } from './pages/LandingPage'
import { LegalPrivacyPage } from './pages/LegalPrivacyPage'
import { LegalTermsPage } from './pages/LegalTermsPage'
import { MessagesPage } from './pages/MessagesPage'
import { ProfilePage } from './pages/ProfilePage'
import { PublicProfilePage } from './pages/PublicProfilePage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { TermsOfServicePage } from './pages/TermsOfServicePage'
import { AdminLayout } from './components/admin/AdminLayout'
import { AdminRoute } from './components/admin/AdminRoute'
import { AdminRegisterPage } from './pages/admin/AdminRegisterPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage'

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/entrar" element={<AuthPage />} />
          <Route path="/admin/register" element={<AdminRegisterPage />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="payments" element={<AdminPaymentsPage />} />
          </Route>
          <Route path="/privacidade" element={<LegalPrivacyPage />} />
          <Route path="/termos" element={<LegalTermsPage />} />
          <Route path="/u/:slug" element={<PublicProfilePage />} />
          <Route path="/privacidade" element={<PrivacyPolicyPage />} />
          <Route path="/termos" element={<TermsOfServicePage />} />
          <Route path="/app" element={<Layout />}>
            <Route index element={<FeedHomePage />} />
            <Route path="jogadores" element={<PlayersPage />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="mensagens" element={<MessagesPage />} />
          </Route>
          <Route path="/perfil" element={<Navigate to="/app/perfil" replace />} />
          <Route path="/mensagens" element={<Navigate to="/app/mensagens" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  )
}
