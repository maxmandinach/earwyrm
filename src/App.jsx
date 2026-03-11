import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Landing from './pages/Landing'
import LoadingScreen from './components/LoadingScreen'

// Lazy-loaded routes
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const History = lazy(() => import('./pages/History'))
const Settings = lazy(() => import('./pages/Settings'))
const PublicProfile = lazy(() => import('./pages/PublicProfile'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const SharedLyric = lazy(() => import('./pages/SharedLyric'))
const Collections = lazy(() => import('./pages/Collections'))
const CollectionDetail = lazy(() => import('./pages/CollectionDetail'))
const Explore = lazy(() => import('./pages/Explore'))
const ArtistPage = lazy(() => import('./pages/ArtistPage'))
const SongPage = lazy(() => import('./pages/SongPage'))
const Activity = lazy(() => import('./pages/Activity'))
const Following = lazy(() => import('./pages/Following'))
const EmailConfirmed = lazy(() => import('./pages/EmailConfirmed'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const Admin = lazy(() => import('./pages/Admin'))

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AuthRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (user) {
    return <Navigate to="/home" replace />
  }

  return children
}

function IndexRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (user) {
    return <Navigate to="/home" replace />
  }

  return <Landing />
}

function AtUsernameRedirect() {
  const path = window.location.pathname
  if (path.startsWith('/@')) {
    const username = path.slice(2)
    return <Navigate to={`/u/${username}`} replace />
  }
  return <Navigate to="/" replace />
}

function RedirectToArtist() {
  const { name } = useParams()
  return <Navigate to={`/artist/${name}`} replace />
}

function RedirectToSong() {
  const { name } = useParams()
  return <Navigate to={`/song/${name}`} replace />
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
    <Routes>
      {/* Landing page - standalone, no layout */}
      <Route path="/" element={<IndexRoute />} />

      {/* Layout-wrapped routes */}
      <Route element={<Layout />}>
        <Route
          path="home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="collections"
          element={
            <ProtectedRoute>
              <Collections />
            </ProtectedRoute>
          }
        />
        <Route path="collections/:id" element={<CollectionDetail />} />
        <Route
          path="settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="activity"
          element={
            <ProtectedRoute>
              <Activity />
            </ProtectedRoute>
          }
        />
        <Route
          path="login"
          element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          }
        />
        <Route
          path="signup"
          element={
            <AuthRoute>
              <Signup />
            </AuthRoute>
          }
        />
        <Route path="explore" element={<Explore />} />
        <Route path="explore/:filterType/:filterValue" element={<Explore />} />
        <Route
          path="following"
          element={
            <ProtectedRoute>
              <Following />
            </ProtectedRoute>
          }
        />
        <Route path="artist/:slug" element={<ArtistPage />} />
        <Route path="song/:slug" element={<SongPage />} />
        <Route path="auth/callback" element={<AuthCallback />} />
        <Route path="confirmed" element={<EmailConfirmed />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* Redirects from old explore filter routes to new dedicated pages */}
        <Route path="explore/artist/:name" element={<RedirectToArtist />} />
        <Route path="explore/song/:name" element={<RedirectToSong />} />
      </Route>

      {/* Public routes - no layout, accessible to all */}
      <Route path="/s/:token" element={<SharedLyric />} />
      <Route path="u/:username" element={<PublicProfile />} />
      <Route path="*" element={<AtUsernameRedirect />} />
    </Routes>
    </Suspense>
  )
}
