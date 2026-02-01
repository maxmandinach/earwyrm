import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'

function formatTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

export default function CompactCommentModal({ lyricId, shareToken, onClose }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    async function fetchComments() {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*, profiles:user_id(username)')
          .eq('lyric_id', lyricId)
          .order('created_at', { ascending: false })

        if (!error && data) setComments(data.slice(0, 3))
      } catch (err) {
        console.error('Error fetching comments:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchComments()
  }, [lyricId])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  async function handlePost(e) {
    e.preventDefault()
    if (!newComment.trim() || !user) return

    setPosting(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          lyric_id: lyricId,
          user_id: user.id,
          content: newComment.trim(),
          parent_comment_id: null,
        })
        .select('*, profiles:user_id(username)')
        .single()

      if (!error && data) {
        setComments(prev => [data, ...prev].slice(0, 3))
        setNewComment('')
      }
    } catch (err) {
      console.error('Error posting comment:', err)
    } finally {
      setPosting(false)
    }
  }

  const linkTo = shareToken ? `/l/${shareToken}` : null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-charcoal/10" onClick={onClose} />

      {/* Modal */}
      <div
        ref={ref}
        className="relative w-full max-w-xs p-4"
        style={{
          backgroundColor: 'var(--surface-card, #F5F2ED)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-charcoal/40 lowercase">comments</span>
          <button onClick={onClose} className="text-charcoal/30 hover:text-charcoal/60 transition-colors text-sm">
            ✕
          </button>
        </div>

        {/* Comments */}
        {loading ? (
          <p className="text-xs text-charcoal/30 py-4 text-center">loading...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-charcoal/30 py-4 text-center">no comments yet</p>
        ) : (
          <div className="space-y-2.5 mb-3">
            {comments.map(comment => (
              <div key={comment.id}>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-medium text-charcoal/50">
                    @{comment.profiles?.username || 'anon'}
                  </span>
                  <span className="text-[10px] text-charcoal/25">{formatTime(comment.created_at)}</span>
                </div>
                <p className="text-sm text-charcoal/70 leading-snug mt-0.5">{comment.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        {user ? (
          <form onSubmit={handlePost} className="flex gap-2 mt-2">
            <input
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="add a comment..."
              maxLength={280}
              className="flex-1 text-xs px-3 py-1.5 bg-transparent border border-charcoal/10 focus:border-charcoal/30 focus:outline-none text-charcoal placeholder:text-charcoal/25"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || posting}
              className="text-xs text-charcoal/40 hover:text-charcoal/70 disabled:opacity-30 transition-colors px-1"
            >
              {posting ? '...' : '↑'}
            </button>
          </form>
        ) : (
          <p className="text-xs text-charcoal/30 text-center mt-2">sign in to comment</p>
        )}

        {/* View all link */}
        {linkTo && (
          <Link
            to={linkTo}
            className="block text-center text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors mt-3 pt-2"
            style={{ borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}
          >
            view all →
          </Link>
        )}
      </div>
    </div>,
    document.body
  )
}
