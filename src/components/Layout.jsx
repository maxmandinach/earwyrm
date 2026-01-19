import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

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
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="px-4 py-4 flex justify-between items-center">
        <Link
          to={user ? "/home" : "/"}
          className="text-charcoal font-medium tracking-tight hover:opacity-70 transition-opacity"
        >
          earwyrm
        </Link>

        {user && !isAuthPage && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-charcoal-light hover:text-charcoal transition-colors"
              aria-label="Menu"
            >
              <svg
                width="20"
                height="20"
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
              <div className="absolute right-0 mt-2 w-48 bg-cream border border-charcoal/20 shadow-lg z-50">
                <nav className="py-2">
                  <Link
                    to="/history"
                    className="block px-4 py-2 text-sm text-charcoal-light hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                  >
                    My collection
                  </Link>
                  <Link
                    to="/collections"
                    className="block px-4 py-2 text-sm text-charcoal-light hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                  >
                    Collections
                  </Link>
                  <Link
                    to="/digest"
                    className="block px-4 py-2 text-sm text-charcoal-light hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                  >
                    Weekly digest
                  </Link>
                  <Link
                    to="/settings"
                    className="block px-4 py-2 text-sm text-charcoal-light hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                  >
                    Settings
                  </Link>
                  <div className="my-1 border-t border-charcoal/10" />
                  <button
                    onClick={signOut}
                    className="w-full text-left px-4 py-2 text-sm text-charcoal-light hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                  >
                    Sign out
                  </button>
                </nav>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <footer className="px-4 py-6 border-t border-charcoal/10">
        <div className="flex items-center justify-center gap-4 text-xs text-charcoal-light/60">
          <Link to="/privacy" className="hover:text-charcoal transition-colors">
            Privacy
          </Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-charcoal transition-colors">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  )
}
