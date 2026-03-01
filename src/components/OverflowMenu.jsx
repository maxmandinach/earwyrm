import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useBlock } from '../contexts/BlockContext'
import ReportModal from './ReportModal'

export default function OverflowMenu({ isOwn, lyric, username, profileIsPublic, onEdit, onReplace }) {
  const [open, setOpen] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const { blockUser, isBlocked } = useBlock()
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const hasArtist = !!lyric.artist_name
  const hasSong = !!lyric.song_title
  const hasProfile = !!username && profileIsPublic !== false
  const userIsBlocked = lyric.user_id ? isBlocked(lyric.user_id) : false

  const handleBlock = () => {
    if (lyric.user_id) {
      blockUser(lyric.user_id)
    }
    setShowBlockConfirm(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 text-charcoal/30 hover:text-charcoal/50 transition-colors"
        title="More"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-charcoal/10 shadow-lg z-50 min-w-[180px] py-1">
          {isOwn ? (
            <>
              <button
                onClick={() => { setOpen(false); onEdit?.() }}
                className="w-full text-left px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
              >
                Edit lyric
              </button>
              <button
                onClick={() => { setOpen(false); onReplace?.() }}
                className="w-full text-left px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
              >
                New lyric
              </button>
            </>
          ) : (
            <>
              {hasArtist ? (
                <Link
                  to={`/artist/${encodeURIComponent(lyric.artist_name.toLowerCase())}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
                >
                  Go to artist page
                </Link>
              ) : (
                <span className="block px-4 py-2 text-sm text-charcoal/20 cursor-default">
                  Go to artist page
                </span>
              )}
              {hasSong ? (
                <Link
                  to={`/song/${encodeURIComponent(lyric.song_title.toLowerCase())}${hasArtist ? `?artist=${encodeURIComponent(lyric.artist_name)}` : ''}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
                >
                  Go to song page
                </Link>
              ) : (
                <span className="block px-4 py-2 text-sm text-charcoal/20 cursor-default">
                  Go to song page
                </span>
              )}
              {hasProfile ? (
                <Link
                  to={`/u/${username}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-charcoal/70 hover:bg-charcoal/5 transition-colors"
                >
                  Go to @{username}
                </Link>
              ) : (
                <span className="block px-4 py-2 text-sm text-charcoal/20 cursor-default">
                  Go to @user
                </span>
              )}
              <div className="border-t border-charcoal/10 my-1" />
              <button
                onClick={() => { setOpen(false); setShowReport(true) }}
                className="w-full text-left px-4 py-2 text-sm text-red-500/70 hover:bg-red-50 transition-colors"
              >
                Report
              </button>
              {lyric.user_id && (
                <button
                  onClick={() => { setOpen(false); setShowBlockConfirm(true) }}
                  className="w-full text-left px-4 py-2 text-sm text-red-500/70 hover:bg-red-50 transition-colors"
                >
                  {userIsBlocked ? 'Unblock user' : 'Block user'}
                </button>
              )}
            </>
          )}
        </div>
      )}
      {showReport && (
        <ReportModal
          contentType="lyric"
          contentId={lyric.id}
          onClose={() => setShowReport(false)}
        />
      )}
      {showBlockConfirm && (
        <BlockConfirmModal
          username={username}
          onConfirm={handleBlock}
          onCancel={() => setShowBlockConfirm(false)}
        />
      )}
    </div>
  )
}

function BlockConfirmModal({ username, onConfirm, onCancel }) {
  const content = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="w-full max-w-xs rounded-lg p-6 text-center"
        style={{
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          color: 'var(--text-primary, #2C2825)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <h3
          className="text-base font-medium mb-2"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          Block {username ? `@${username}` : 'this user'}?
        </h3>
        <p className="text-sm opacity-50 mb-6">
          Their content will be hidden from your feeds. You can unblock from Settings.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm transition-colors"
            style={{ color: 'var(--text-secondary, #6B635A)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: '#D4756A', borderRadius: '10px' }}
          >
            Block
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
