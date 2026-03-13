import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import SearchBar from './SearchBar'
import ActivityDropdown from './ActivityDropdown'

export default function Layout() {
  const { user } = useAuth()
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'

  function isActive(path) {
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-4 flex justify-between items-center">
        <Link
          to={user ? "/home" : "/"}
          className="hover:opacity-70 transition-opacity"
          style={{ fontFamily: "'Caveat', cursive", fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary, #2C2825)' }}
        >
          earwyrm
        </Link>

        <div className="flex items-center gap-2">
          {/* Global search */}
          <SearchBar />

          {/* Anonymous header links */}
          {!user && !isAuthPage && (
            <div className="flex items-center gap-3">
              <Link
                to="/explore"
                className="text-sm text-charcoal/50 hover:text-charcoal transition-colors"
              >
                Explore
              </Link>
              <Link
                to="/login"
                className="text-sm text-charcoal/50 hover:text-charcoal transition-colors"
              >
                Sign in
              </Link>
            </div>
          )}

          {/* Logged-in nav */}
          {user && !isAuthPage && (
            <div className="flex items-center gap-1">
              <Link
                to="/home"
                className={`px-3 py-2 text-sm transition-colors ${
                  isActive('/home') ? 'text-charcoal/70' : 'text-charcoal/30 hover:text-charcoal/50'
                }`}
              >
                home
              </Link>
              <Link
                to="/explore"
                className={`px-3 py-2 text-sm transition-colors ${
                  isActive('/explore') ? 'text-charcoal/70' : 'text-charcoal/30 hover:text-charcoal/50'
                }`}
              >
                explore
              </Link>
              <Link
                to="/profile"
                className={`px-3 py-2 text-sm transition-colors ${
                  isActive('/profile') ? 'text-charcoal/70' : 'text-charcoal/30 hover:text-charcoal/50'
                }`}
              >
                profile
              </Link>
              <ActivityDropdown />
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col" key={location.pathname}>
        <div className="flex-1 flex flex-col page-enter">
          <Outlet />
        </div>
      </main>

      <footer className="px-4 py-6 border-t border-charcoal/10">
        <div className="flex items-center justify-center gap-4 text-sm sm:text-xs text-charcoal/30">
          <Link to="/privacy" className="py-3 sm:py-0 hover:text-charcoal transition-colors">
            Privacy
          </Link>
          <span>·</span>
          <Link to="/terms" className="py-3 sm:py-0 hover:text-charcoal transition-colors">
            Terms
          </Link>
          <span>·</span>
          <a href="/dmca.html" className="py-3 sm:py-0 hover:text-charcoal transition-colors">
            DMCA
          </a>
        </div>
      </footer>
    </div>
  )
}
