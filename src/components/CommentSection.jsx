import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'
import { formatRelativeTime } from '../lib/utils'

export default function CommentSection({ lyricId, initialCount = 0, startOpen = false }) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(startOpen)
  const [comments, setComments] = useState([])
  const [count, setCount] = useState(initialCount)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen || !lyricId) return

    async function fetchComments() {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles:user_id(username)')
        .eq('lyric_id', lyricId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setComments(data)
      }
    }
    fetchComments()
  }, [isOpen, lyricId])

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
        .select('*, profiles:user_id(username)')
        .single()

      if (error) throw error

      setComments(prev => [...prev, data])
      setCount(prev => prev + 1)
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
      setCount(prev => prev - 1)
    } catch (err) {
      console.error('Error deleting comment:', err)
    }
  }

  // Collapsed view
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors py-1 px-2"
      >
        {count > 0 ? `${count} ${count === 1 ? 'thought' : 'thoughts'}` : 'add a thought'}
      </button>
    )
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
      {/* Input first — what you came here to do */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value.slice(0, 280))}
            placeholder={replyTo ? 'Reply...' : 'Share a thought...'}
            autoFocus
            className="flex-1 px-3 py-2 text-sm bg-transparent border border-charcoal/10 text-charcoal focus:outline-none focus:border-charcoal/30 placeholder:text-charcoal/25"
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
        <p className="mb-4 text-xs text-charcoal/30 text-center">
          <Link to="/signup" className="underline hover:text-charcoal/50">Sign up</Link> to share your thoughts
        </p>
      )}

      <div className="space-y-3">
        {topLevel.map((comment) => (
          <div key={comment.id}>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {comment.profiles?.username && (
                    <Link
                      to={`/u/${comment.profiles.username}`}
                      className="text-xs text-charcoal/50 hover:text-charcoal transition-colors font-medium"
                    >
                      @{comment.profiles.username}
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
                </div>
              </div>
            </div>

            {/* Replies */}
            {replies[comment.id] && (
              <div className="ml-6 mt-2 space-y-2 border-l border-charcoal/5 pl-3">
                {replies[comment.id].map((reply) => (
                  <div key={reply.id}>
                    <div className="flex items-center gap-2">
                      {reply.profiles?.username && (
                        <Link
                          to={`/u/${reply.profiles.username}`}
                          className="text-xs text-charcoal/50 hover:text-charcoal transition-colors font-medium"
                        >
                          @{reply.profiles.username}
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
                    {user?.id === reply.user_id && (
                      <button
                        onClick={() => handleDelete(reply.id)}
                        className="text-xs text-charcoal/20 hover:text-charcoal/40 transition-colors mt-0.5"
                      >
                        delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => setIsOpen(false)}
        className="text-xs text-charcoal/20 hover:text-charcoal/40 transition-colors mt-3"
      >
        hide thoughts
      </button>
    </div>
  )
}
