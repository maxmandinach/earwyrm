import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase-wrapper'
import { useNavigate } from 'react-router-dom'
import { formatRelativeTime } from '../lib/utils'

export default function Admin() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('reports')
  const [reports, setReports] = useState([])
  const [bannedUsers, setBannedUsers] = useState([])
  const [blockedWords, setBlockedWords] = useState([])
  const [newWord, setNewWord] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  // Guard: redirect non-admins
  useEffect(() => {
    if (profile && !profile.is_admin) {
      navigate('/home', { replace: true })
    }
  }, [profile, navigate])

  useEffect(() => {
    if (!profile?.is_admin) return
    if (tab === 'reports') fetchReports()
    else if (tab === 'banned') fetchBannedUsers()
    else if (tab === 'words') fetchBlockedWords()
  }, [tab, profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchReports() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('content_reports')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Enrich with content and reporter info
      const enriched = await Promise.all((data || []).map(async (report) => {
        const { data: reporter } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', report.reporter_id)
          .single()

        let content = null
        let authorId = null
        let authorUsername = null

        if (report.content_type === 'lyric') {
          const { data: lyric } = await supabase
            .from('lyrics')
            .select('content, song_title, artist_name, user_id, is_public')
            .eq('id', report.content_id)
            .single()
          content = lyric
          authorId = lyric?.user_id
        } else if (report.content_type === 'comment') {
          const { data: comment } = await supabase
            .from('comments')
            .select('content, user_id')
            .eq('id', report.content_id)
            .single()
          content = comment
          authorId = comment?.user_id
        }

        if (authorId) {
          const { data: author } = await supabase
            .from('profiles')
            .select('username, banned_at')
            .eq('id', authorId)
            .single()
          authorUsername = author?.username
          content = { ...content, authorBanned: !!author?.banned_at }
        }

        return {
          ...report,
          reporterUsername: reporter?.username,
          content,
          authorId,
          authorUsername,
        }
      }))

      setReports(enriched)
    } catch (err) {
      console.error('Error fetching reports:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchBannedUsers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, banned_at')
        .not('banned_at', 'is', null)
        .order('banned_at', { ascending: false })

      if (error) throw error
      setBannedUsers(data || [])
    } catch (err) {
      console.error('Error fetching banned users:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchBlockedWords() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('blocked_words')
        .select('*')
        .order('word')

      if (error) throw error
      setBlockedWords(data || [])
    } catch (err) {
      console.error('Error fetching blocked words:', err)
    } finally {
      setLoading(false)
    }
  }

  async function dismissReport(reportId) {
    setActionLoading(reportId)
    try {
      await supabase
        .from('content_reports')
        .update({ status: 'dismissed' })
        .eq('id', reportId)
      setReports(prev => prev.filter(r => r.id !== reportId))
    } catch (err) {
      console.error('Error dismissing report:', err)
    } finally {
      setActionLoading(null)
    }
  }

  async function removeContent(report) {
    setActionLoading(report.id)
    try {
      if (report.content_type === 'lyric') {
        await supabase
          .from('lyrics')
          .update({ is_public: false })
          .eq('id', report.content_id)
      } else if (report.content_type === 'comment') {
        await supabase
          .from('comments')
          .delete()
          .eq('id', report.content_id)
      }

      await supabase
        .from('content_reports')
        .update({ status: 'resolved' })
        .eq('id', report.id)

      setReports(prev => prev.filter(r => r.id !== report.id))
    } catch (err) {
      console.error('Error removing content:', err)
    } finally {
      setActionLoading(null)
    }
  }

  async function banUser(userId, reportId) {
    setActionLoading(reportId)
    try {
      await supabase
        .from('profiles')
        .update({ banned_at: new Date().toISOString() })
        .eq('id', userId)

      await supabase
        .from('content_reports')
        .update({ status: 'resolved' })
        .eq('id', reportId)

      setReports(prev => prev.filter(r => r.id !== reportId))
    } catch (err) {
      console.error('Error banning user:', err)
    } finally {
      setActionLoading(null)
    }
  }

  async function unbanUser(userId) {
    setActionLoading(userId)
    try {
      await supabase
        .from('profiles')
        .update({ banned_at: null })
        .eq('id', userId)

      setBannedUsers(prev => prev.filter(u => u.id !== userId))
    } catch (err) {
      console.error('Error unbanning user:', err)
    } finally {
      setActionLoading(null)
    }
  }

  async function addBlockedWord() {
    const word = newWord.trim().toLowerCase()
    if (!word) return
    try {
      const { data, error } = await supabase
        .from('blocked_words')
        .insert({ word })
        .select()
        .single()

      if (error) throw error
      setBlockedWords(prev => [...prev, data].sort((a, b) => a.word.localeCompare(b.word)))
      setNewWord('')
    } catch (err) {
      console.error('Error adding word:', err)
    }
  }

  async function removeBlockedWord(id) {
    try {
      await supabase
        .from('blocked_words')
        .delete()
        .eq('id', id)

      setBlockedWords(prev => prev.filter(w => w.id !== id))
    } catch (err) {
      console.error('Error removing word:', err)
    }
  }

  if (!profile?.is_admin) return null

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase mb-8">moderation</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-charcoal/10">
          {[
            { id: 'reports', label: 'reports' },
            { id: 'banned', label: 'banned users' },
            { id: 'words', label: 'blocked words' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-xs uppercase tracking-wider pb-3 transition-colors ${
                tab === t.id
                  ? 'text-charcoal/70 border-b-2 border-charcoal/30'
                  : 'text-charcoal/30 hover:text-charcoal/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Reports Tab */}
        {tab === 'reports' && (
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-charcoal/30">Loading reports...</p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-charcoal/30">No pending reports.</p>
            ) : (
              reports.map(report => (
                <div key={report.id} className="border border-charcoal/10 rounded-lg p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-charcoal/30">
                        {report.content_type}
                      </span>
                      <span className="text-xs text-charcoal/20 ml-2">
                        reported by @{report.reporterUsername}
                      </span>
                    </div>
                    <span className="text-xs text-charcoal/20">
                      {formatRelativeTime(report.created_at)}
                    </span>
                  </div>

                  {/* Reason */}
                  <p className="text-xs text-charcoal/40">
                    Reason: {report.reason}
                  </p>

                  {/* Content preview */}
                  {report.content && (
                    <div className="bg-charcoal/5 rounded-md p-3">
                      <p className="text-sm text-charcoal/70" style={{ fontFamily: "'Caveat', cursive" }}>
                        {report.content.content}
                      </p>
                      {report.content.song_title && (
                        <p className="text-xs text-charcoal/30 mt-1">
                          {report.content.song_title}
                          {report.content.artist_name && ` \u2014 ${report.content.artist_name}`}
                        </p>
                      )}
                      <p className="text-xs text-charcoal/30 mt-1">
                        by @{report.authorUsername}
                        {report.content.authorBanned && (
                          <span className="ml-2 text-red-400/60">(banned)</span>
                        )}
                        {report.content.is_public === false && (
                          <span className="ml-2 text-charcoal/20">(hidden)</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => dismissReport(report.id)}
                      disabled={actionLoading === report.id}
                      className="text-xs px-3 py-1.5 rounded-full border border-charcoal/10 text-charcoal/40 hover:text-charcoal/60 hover:border-charcoal/20 transition-colors disabled:opacity-30"
                    >
                      dismiss
                    </button>
                    <button
                      onClick={() => removeContent(report)}
                      disabled={actionLoading === report.id}
                      className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-400 hover:bg-red-50 transition-colors disabled:opacity-30"
                    >
                      remove content
                    </button>
                    {report.authorId && !report.content?.authorBanned && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Ban @${report.authorUsername}? They won't be able to post.`)) {
                            banUser(report.authorId, report.id)
                          }
                        }}
                        disabled={actionLoading === report.id}
                        className="text-xs px-3 py-1.5 rounded-full border border-red-300 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                      >
                        ban user
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Banned Users Tab */}
        {tab === 'banned' && (
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-charcoal/30">Loading...</p>
            ) : bannedUsers.length === 0 ? (
              <p className="text-sm text-charcoal/30">No banned users.</p>
            ) : (
              bannedUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between border border-charcoal/10 rounded-lg p-3">
                  <div>
                    <p className="text-sm text-charcoal/70">@{u.username}</p>
                    <p className="text-xs text-charcoal/30">
                      banned {formatRelativeTime(u.banned_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => unbanUser(u.id)}
                    disabled={actionLoading === u.id}
                    className="text-xs px-3 py-1.5 rounded-full border border-charcoal/10 text-charcoal/40 hover:text-charcoal/60 transition-colors disabled:opacity-30"
                  >
                    unban
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Blocked Words Tab */}
        {tab === 'words' && (
          <div className="space-y-4">
            <form
              onSubmit={(e) => { e.preventDefault(); addBlockedWord() }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Add a word..."
                className="flex-1 px-4 py-2 text-sm bg-transparent border border-charcoal/10 rounded-full text-charcoal focus:outline-none focus:border-charcoal/30 placeholder:text-charcoal/25"
              />
              <button
                type="submit"
                disabled={!newWord.trim()}
                className="text-xs px-4 py-2 rounded-full text-charcoal/50 hover:text-charcoal transition-colors disabled:opacity-30"
              >
                add
              </button>
            </form>

            {loading ? (
              <p className="text-sm text-charcoal/30">Loading...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {blockedWords.map(w => (
                  <span
                    key={w.id}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-charcoal/10 text-charcoal/50"
                  >
                    {w.word}
                    <button
                      onClick={() => removeBlockedWord(w.id)}
                      className="text-charcoal/20 hover:text-charcoal/50 ml-1"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
