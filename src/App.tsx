import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthPage } from './pages/AuthPage'
import { FeedHomePage } from './pages/FeedHomePage'
import { PlayersPage } from './pages/PlayersPage'
import { LandingPage } from './pages/LandingPage'
import { MessagesPage } from './pages/MessagesPage'
import { ProfilePage } from './pages/ProfilePage'
import { PublicProfilePage } from './pages/PublicProfilePage'
export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/entrar" element={<AuthPage />} />
          <Route path="/u/:slug" element={<PublicProfilePage />} />
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
