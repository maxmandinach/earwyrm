import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'
import { formatRelativeTime } from '../lib/utils'
import ReportModal from './ReportModal'
import PlusBadge from './PlusBadge'

export default function CommentSection({ lyricId, initialCount = 0, onSignupPrompt, highlightCommentId = null, onCountChange }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [highlightedId, setHighlightedId] = useState(highlightCommentId)
  const [reportingCommentId, setReportingCommentId] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (highlightCommentId) {
      setHighlightedId(highlightCommentId)
      const timer = setTimeout(() => setHighlightedId(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [highlightCommentId])

  useEffect(() => {
    if (!lyricId) return

    async function fetchComments() {
      setCommentsLoading(true)
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('lyric_id', lyricId)
          .order('created_at', { ascending: true })

        if (!error && data) {
          const userIds = [...new Set(data.map(c => c.user_id))]
          const { data: profiles } = userIds.length > 0
            ? await supabase.from('profiles').select('id, username, subscription_tier').in('id', userIds)
            : { data: [] }
          const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
          setComments(data.map(c => ({ ...c, profiles: profileMap[c.user_id] || null })))
        }
      } finally {
        setCommentsLoading(false)
      }
    }
    fetchComments()
  }, [lyricId])

  // Auto-focus input when loading finishes
  useEffect(() => {
    if (!commentsLoading && inputRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commentsLoading])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user || !newComment.trim() || submitting) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          lyric_id: lyricId,
          user_id: user.id,
          content: newComment.trim(),
          parent_comment_id: replyTo || null,
        })
        .select('*')
        .single()

      if (error) throw error

      // Attach current user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, subscription_tier')
        .eq('id', user.id)
        .single()

      setComments(prev => [...prev, { ...data, profiles: profile }])
      onCountChange?.(1)
      setNewComment('')
      setReplyTo(null)
    } catch (err) {
      console.error('Error posting comment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId) {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      setComments(prev => prev.filter(c => c.id !== commentId))
      onCountChange?.(-1)
    } catch (err) {
      console.error('Error deleting comment:', err)
    }
  }

  // Group comments: top-level + replies
  const topLevel = comments.filter(c => !c.parent_comment_id)
  const replies = {}
  comments.filter(c => c.parent_comment_id).forEach(c => {
    if (!replies[c.parent_comment_id]) replies[c.parent_comment_id] = []
    replies[c.parent_comment_id].push(c)
  })

  return (
    <div className="w-full mt-3 max-w-lg mx-auto">
      {/* Comments */}
      <div className="space-y-3">
        {commentsLoading ? (
          Array.from({ length: Math.min(initialCount || 1, 3) }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-2 mb-1">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-3 w-8" />
              </div>
              <div className="skeleton h-4 w-3/4 mt-1" />
            </div>
          ))
        ) : topLevel.map((comment) => (
          <div
            key={comment.id}
            className={comment.id === highlightedId ? 'notification-highlight rounded-lg' : ''}
            style={comment.id === highlightedId ? { padding: '6px 8px', margin: '-6px -8px' } : undefined}
          >
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {comment.profiles?.username && (
                    <Link
                      to={`/u/${comment.profiles.username}`}
                      className="text-xs text-charcoal/50 hover:text-charcoal transition-colors font-medium"
                    >
                      @{comment.profiles.username}
                      {comment.profiles.subscription_tier === 'plus' && <PlusBadge />}
                    </Link>
                  )}
                  <span className="text-xs text-charcoal/20">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                </div>
                <p
                  className="text-sm text-charcoal/70 mt-0.5 leading-relaxed"
                  style={{ fontFamily: "'Caveat', cursive", fontSize: '1.1rem' }}
                >
                  {comment.content}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {user && (
                    <button
                      onClick={() => {
                        setReplyTo(comment.id)
                        setNewComment(comment.profiles?.username ? `@${comment.profiles.username} ` : '')
                      }}
                      className="text-xs text-charcoal/20 hover:text-charcoal/40 transition-colors"
                    >
                      reply
                    </button>
                  )}
                  {user?.id === comment.user_id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-xs text-charcoal/20 hover:text-charcoal/40 transition-colors"
                    >
                      delete
                    </button>
                  )}
                  {user && user.id !== comment.user_id && (
                    <button
                      onClick={() => setReportingCommentId(comment.id)}
                      className="text-xs text-charcoal/15 hover:text-red-400/60 transition-colors"
                    >
                      report
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Replies */}
            {replies[comment.id] && (
              <div className="ml-6 mt-2 space-y-2 border-l border-charcoal/5 pl-3">
                {replies[comment.id].map((reply) => (
                  <div
                    key={reply.id}
                    className={reply.id === highlightedId ? 'notification-highlight rounded-lg' : ''}
                    style={reply.id === highlightedId ? { padding: '4px 6px', margin: '-4px -6px' } : undefined}
                  >
                    <div className="flex items-center gap-2">
                      {reply.profiles?.username && (
                        <Link
                          to={`/u/${reply.profiles.username}`}
                          className="text-xs text-charcoal/50 hover:text-charcoal transition-colors font-medium"
                        >
                          @{reply.profiles.username}
                          {reply.profiles.subscription_tier === 'plus' && <PlusBadge />}
                        </Link>
                      )}
                      <span className="text-xs text-charcoal/20">
                        {formatRelativeTime(reply.created_at)}
                      </span>
                    </div>
                    <p
                      className="text-sm text-charcoal/60 mt-0.5"
                      style={{ fontFamily: "'Caveat', cursive", fontSize: '1rem' }}
                    >
                      {reply.content}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {user?.id === reply.user_id && (
                        <button
                          onClick={() => handleDelete(reply.id)}
                          className="text-xs text-charcoal/20 hover:text-charcoal/40 transition-colors"
                        >
                          delete
                        </button>
                      )}
                      {user && user.id !== reply.user_id && (
                        <button
                          onClick={() => setReportingCommentId(reply.id)}
                          className="text-xs text-charcoal/15 hover:text-red-400/60 transition-colors"
                        >
                          report
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value.slice(0, 280))}
            placeholder={replyTo ? 'Reply...' : 'Share a thought...'}
            className="flex-1 px-4 py-2 text-sm bg-transparent border border-charcoal/10 rounded-full text-charcoal focus:outline-none focus:border-charcoal/30 placeholder:text-charcoal/25"
            style={{ fontFamily: "'Caveat', cursive", fontSize: '1rem' }}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="px-3 py-2 text-xs text-charcoal/50 hover:text-charcoal transition-colors disabled:opacity-30"
          >
            {submitting ? '...' : 'post'}
          </button>
          {replyTo && (
            <button
              type="button"
              onClick={() => { setReplyTo(null); setNewComment('') }}
              className="text-xs text-charcoal/20 hover:text-charcoal/40"
            >
              ✕
            </button>
          )}
        </form>
      ) : (
        <p className="mt-4 text-xs text-charcoal/30 text-center">
          {onSignupPrompt ? (
            <button onClick={onSignupPrompt} className="underline hover:text-charcoal/50">Sign up</button>
          ) : (
            <Link to="/signup" className="underline hover:text-charcoal/50">Sign up</Link>
          )} to share your thoughts
        </p>
      )}
      {reportingCommentId && (
        <ReportModal
          contentType="comment"
          contentId={reportingCommentId}
          onClose={() => setReportingCommentId(null)}
        />
      )}
    </div>
  )
}
