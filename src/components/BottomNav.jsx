import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLyric } from '../contexts/LyricContext'
import ReplaceModal from './ReplaceModal'
import LyricForm from './LyricForm'
import ModalSheet from './ModalSheet'

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function ExploreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function NewIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function ArchiveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="13" y2="11" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="18" r="1.5" fill="currentColor" />
    </svg>
  )
}

function MoreSheet({ onClose }) {
  const { signOut } = useAuth()

  return (
    <ModalSheet onClose={onClose} title="More">
      <nav className="py-2">
        <Link
          to="/following"
          onClick={onClose}
          className="block px-5 py-3.5 text-base text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
        >
          feed
        </Link>
        <Link
          to="/activity"
          onClick={onClose}
          className="block px-5 py-3.5 text-base text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
        >
          activity
        </Link>
        <div className="my-1 border-t border-charcoal/10" />
        <Link
          to="/settings"
          onClick={onClose}
          className="block px-5 py-3.5 text-base text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
        >
          settings
        </Link>
        <button
          onClick={() => { onClose(); signOut() }}
          className="w-full text-left px-5 py-3.5 text-base text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
        >
          sign out
        </button>
      </nav>
    </ModalSheet>
  )
}

export default function BottomNav() {
  const { user } = useAuth()
  const { currentLyric, setLyric } = useLyric()
  const location = useLocation()
  const [showNewModal, setShowNewModal] = useState(false)
  const [showMoreSheet, setShowMoreSheet] = useState(false)
  const [allUserTags] = useState([])

  if (!user) return null

  const path = location.pathname

  const isActive = (route) => {
    if (route === '/home') return path === '/home'
    if (route === '/explore') return path.startsWith('/explore')
    if (route === '/archive') return path === '/archive' || path === '/history' || path.startsWith('/collections')
    return false
  }

  const tabs = [
    { key: 'home', label: 'Home', icon: HomeIcon, route: '/home' },
    { key: 'explore', label: 'Explore', icon: ExploreIcon, route: '/explore' },
    { key: 'new', label: 'New', icon: NewIcon, route: null },
    { key: 'archive', label: 'Archive', icon: ArchiveIcon, route: '/archive' },
    { key: 'more', label: 'More', icon: MoreIcon, route: null },
  ]

  // Track active index for indicator position
  const activeIndex = tabs.findIndex(t => t.route && isActive(t.route))

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{
          backgroundColor: 'var(--surface-elevated, #FAF8F5)',
          borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
          paddingBottom: '8px',
        }}
      >
        <div className="flex items-center justify-around px-2 h-14 relative">
          {/* Active indicator dot */}
          {activeIndex >= 0 && (
            <div
              className="absolute top-0 h-0.5 w-8 transition-transform duration-300 ease-out"
              style={{
                backgroundColor: 'var(--text-primary, #2C2825)',
                left: `${(activeIndex / tabs.length) * 100 + (100 / tabs.length / 2)}%`,
                transform: 'translateX(-50%)',
              }}
            />
          )}

          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = tab.route && isActive(tab.route)
            const isCenter = tab.key === 'new'

            if (isCenter) {
              return (
                <button
                  key={tab.key}
                  onClick={() => setShowNewModal(true)}
                  className="flex flex-col items-center justify-center touch-target"
                  style={{
                    color: 'var(--text-primary, #2C2825)',
                    minWidth: '48px',
                  }}
                >
                  <Icon />
                  <span className="text-[10px] mt-0.5">{tab.label}</span>
                </button>
              )
            }

            if (tab.key === 'more') {
              return (
                <button
                  key={tab.key}
                  onClick={() => setShowMoreSheet(true)}
                  className="flex flex-col items-center justify-center touch-target"
                  style={{
                    color: 'var(--text-muted, #9C948A)',
                    minWidth: '48px',
                  }}
                >
                  <Icon />
                  <span className="text-[10px] mt-0.5">{tab.label}</span>
                </button>
              )
            }

            return (
              <Link
                key={tab.key}
                to={tab.route}
                className="flex flex-col items-center justify-center touch-target transition-colors duration-200"
                style={{
                  color: active
                    ? 'var(--text-primary, #2C2825)'
                    : 'var(--text-muted, #9C948A)',
                  minWidth: '48px',
                }}
              >
                <Icon />
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* New lyric modal */}
      {showNewModal && (
        currentLyric ? (
          <ReplaceModal
            onReplace={async (data) => {
              await setLyric(data)
              setShowNewModal(false)
            }}
            onClose={() => setShowNewModal(false)}
            allUserTags={allUserTags}
          />
        ) : (
          <ModalSheet onClose={() => setShowNewModal(false)} title="New lyric">
            <div className="p-5">
              <LyricForm
                onSubmit={async (data) => {
                  await setLyric(data)
                  setShowNewModal(false)
                }}
              />
            </div>
          </ModalSheet>
        )
      )}

      {/* More sheet */}
      {showMoreSheet && <MoreSheet onClose={() => setShowMoreSheet(false)} />}
    </>
  )
}
