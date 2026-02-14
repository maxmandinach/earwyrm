import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import History from './pages/History'
import Settings from './pages/Settings'
import PublicProfile from './pages/PublicProfile'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import SharedLyric from './pages/SharedLyric'
import Collections from './pages/Collections'
import CollectionDetail from './pages/CollectionDetail'
import Explore from './pages/Explore'
import Following from './pages/Following'
import ArtistPage from './pages/ArtistPage'
import SongPage from './pages/SongPage'
import Activity from './pages/Activity'
import LoadingScreen from './components/LoadingScreen'

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
        <Route
          path="collections/:id"
          element={
            <ProtectedRoute>
              <CollectionDetail />
            </ProtectedRoute>
          }
        />
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
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />

        {/* Redirects from old explore filter routes to new dedicated pages */}
        <Route path="explore/artist/:name" element={<RedirectToArtist />} />
        <Route path="explore/song/:name" element={<RedirectToSong />} />
      </Route>

      {/* Public routes - no layout, accessible to all */}
      <Route path="/s/:token" element={<SharedLyric />} />
      <Route path="u/:username" element={<PublicProfile />} />
      <Route path="*" element={<AtUsernameRedirect />} />
    </Routes>
  )
}
