import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import SearchBar from './SearchBar'

export default function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  // Close menu when navigating
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

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
          {/* Global search - available to all users */}
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

          {user && !isAuthPage && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-3 text-charcoal-light hover:text-charcoal transition-colors"
                aria-label="Menu"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="3" y1="5" x2="17" y2="5" />
                  <line x1="3" y1="10" x2="17" y2="10" />
                  <line x1="3" y1="15" x2="17" y2="15" />
                </svg>
              </button>

              {isMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 shadow-lg z-50"
                  style={{
                    backgroundColor: 'var(--surface-elevated, #FAF8F5)',
                    border: '1px solid var(--border-medium, rgba(0,0,0,0.1))',
                  }}
                >
                  <nav className="py-2">
                    {/* Your artifact */}
                    <Link
                      to="/home"
                      className="block px-4 py-3 text-base sm:text-sm text-charcoal hover:bg-charcoal/5 transition-colors"
                    >
                      home
                    </Link>

                    <div className="my-1 border-t border-charcoal/10" />

                    {/* Discover */}
                    <Link
                      to="/explore"
                      className="block px-4 py-3 text-base sm:text-sm text-charcoal-light hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                    >
                      explore
                    </Link>
                    <Link
                      to="/following"
                      className="block px-4 py-3 text-base sm:text-sm text-charcoal-light hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                    >
                      feed
                    </Link>

                    <div className="my-1 border-t border-charcoal/10" />

                    {/* Your archive */}
                    <Link
                      to="/history"
                      className="block px-4 py-3 text-base sm:text-sm text-charcoal-light hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                    >
                      memory lane
                    </Link>
                    <Link
                      to="/collections"
                      className="block px-4 py-3 text-base sm:text-sm text-charcoal-light hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                    >
                      collections
                    </Link>

                    <div className="my-1 border-t border-charcoal/10" />

                    {/* Meta */}
                    <Link
                      to="/settings"
                      className="block px-4 py-3 text-base sm:text-sm text-charcoal-light hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                    >
                      settings
                    </Link>
                    <button
                      onClick={signOut}
                      className="w-full text-left px-4 py-3 text-base sm:text-sm text-charcoal-light hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                    >
                      sign out
                    </button>
                  </nav>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <footer className="px-4 py-6 border-t border-charcoal/10">
        <div className="flex items-center justify-center gap-4 text-sm sm:text-xs text-charcoal-light/60">
          <Link to="/privacy" className="py-3 sm:py-0 hover:text-charcoal transition-colors">
            Privacy
          </Link>
          <span>·</span>
          <Link to="/terms" className="py-3 sm:py-0 hover:text-charcoal transition-colors">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  )
}
