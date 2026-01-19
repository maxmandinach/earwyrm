import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import History from './pages/History'
import Settings from './pages/Settings'
import PublicProfile from './pages/PublicProfile'
import WeeklyDigest from './pages/WeeklyDigestMock'
import DigestTest from './pages/DigestTest'
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
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route
          index
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
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
          path="settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="digest"
          element={
            <ProtectedRoute>
              <WeeklyDigest />
            </ProtectedRoute>
          }
        />
        <Route
          path="digest-test"
          element={
            <ProtectedRoute>
              <DigestTest />
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
      </Route>
      {/* Public routes - no layout, accessible to all */}
      <Route path="/@:username" element={<PublicProfile />} />
      <Route path="/@:username/history" element={<PublicProfile showHistory={true} />} />
    </Routes>
  )
}
