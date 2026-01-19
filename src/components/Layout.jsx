import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="px-4 py-4 flex justify-between items-center">
        <Link
          to={user ? "/home" : "/"}
          className="text-charcoal font-medium tracking-tight hover:opacity-70 transition-opacity"
        >
          earwyrm
        </Link>

        {user && !isAuthPage && (
          <nav className="flex items-center gap-4">
            <Link
              to="/history"
              className="text-sm text-charcoal-light hover:text-charcoal transition-colors"
            >
              Collection
            </Link>
            <Link
              to="/digest"
              className="text-sm text-charcoal-light hover:text-charcoal transition-colors"
            >
              Digest
            </Link>
            <Link
              to="/settings"
              className="text-sm text-charcoal-light hover:text-charcoal transition-colors"
            >
              Settings
            </Link>
            <button
              onClick={signOut}
              className="text-sm text-charcoal-light hover:text-charcoal transition-colors"
            >
              Sign out
            </button>
          </nav>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}
