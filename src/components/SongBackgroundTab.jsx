import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'
import ReportModal from './ReportModal'

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function SongBackgroundTab({ songTitle, artistName }) {
  const { user } = useAuth()
  const [background, setBackground] = useState(null)
  const [authorUsername, setAuthorUsername] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [edits, setEdits] = useState([])
  const [editorNames, setEditorNames] = useState({})
  const [expandedEditId, setExpandedEditId] = useState(null)
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('song_backgrounds')
          .select('*')
          .ilike('song_title', songTitle)
          .ilike('artist_name', artistName || '')
          .limit(1)

        if (cancelled) return

        const bg = data?.[0] || null
        setBackground(bg)

        if (bg?.author_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', bg.author_id)
            .single()
          if (!cancelled) setAuthorUsername(profile?.username)
        }
      } catch (err) {
        console.error('Load background error:', err)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [songTitle, artistName])

  async function loadHistory() {
    if (!background) return
    try {
      const { data: editData } = await supabase
        .from('song_background_edits')
        .select('*')
        .eq('background_id', background.id)
        .order('created_at', { ascending: false })

      setEdits(editData || [])

      const editorIds = [...new Set((editData || []).map(e => e.editor_id))]
      if (editorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', editorIds)
        const names = {}
        ;(profiles || []).forEach(p => { names[p.id] = p.username })
        setEditorNames(names)
      }
    } catch (err) {
      console.error('Load history error:', err)
    }
  }

  async function handleSave() {
    if (!user || isSaving) return
    const trimmed = editContent.trim()
    if (!trimmed) return

    setIsSaving(true)
    try {
      if (background) {
        // Record edit
        await supabase.from('song_background_edits').insert({
          background_id: background.id,
          editor_id: user.id,
          previous_content: background.content,
          new_content: trimmed,
          edit_summary: editSummary.trim() || null,
        })

        // Update background
        const { data } = await supabase
          .from('song_backgrounds')
          .update({ content: trimmed, updated_at: new Date().toISOString() })
          .eq('id', background.id)
          .select()
          .single()

        setBackground(data)
      } else {
        // New background
        const { data } = await supabase
          .from('song_backgrounds')
          .insert({
            song_title: songTitle.toLowerCase(),
            artist_name: (artistName || '').toLowerCase(),
            content: trimmed,
            author_id: user.id,
          })
          .select()
          .single()

        setBackground(data)
        setAuthorUsername(user.user_metadata?.username || user.email?.split('@')[0])
      }

      setIsEditing(false)
      setEditSummary('')
    } catch (err) {
      console.error('Save background error:', err)
    }
    setIsSaving(false)
  }

  function handleRestore(content) {
    setEditContent(content)
    setIsEditing(true)
    setShowHistory(false)
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 bg-charcoal/5 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
        ))}
      </div>
    )
  }

  // Edit mode
  if (isEditing) {
    return (
      <div className="space-y-4">
        <p
          className="text-xl"
          style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-secondary, #6B635A)' }}
        >
          {background ? 'edit background' : 'write about this song'}
        </p>

        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value.slice(0, 2000))}
          placeholder="What's the story behind this song?"
          rows={8}
          className="w-full bg-transparent border border-charcoal/10 rounded-lg p-4 focus:outline-none focus:border-[#B8A99A] resize-none"
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: '0.875rem',
            color: 'var(--text-primary, #2C2825)',
          }}
        />

        <div className="flex items-center justify-between">
          <span className={`text-xs ${editContent.length > 1800 ? 'text-[#B8A99A]' : 'text-charcoal/30'}`}>
            {editContent.length}/2000
          </span>
        </div>

        {background && (
          <input
            type="text"
            value={editSummary}
            onChange={(e) => setEditSummary(e.target.value)}
            placeholder="what changed? (optional)"
            className="w-full bg-transparent border border-charcoal/10 rounded-lg px-4 py-2 focus:outline-none focus:border-[#B8A99A] text-sm"
            style={{ color: 'var(--text-secondary, #6B635A)' }}
          />
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsEditing(false)}
            className="text-sm text-charcoal/50 hover:text-charcoal transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!editContent.trim() || isSaving}
            className="px-6 py-2 text-sm font-medium text-white rounded-lg transition-all"
            style={{
              backgroundColor: editContent.trim() ? '#B8A99A' : 'var(--text-muted, #9C948A)',
              opacity: editContent.trim() ? 1 : 0.3,
              cursor: editContent.trim() && !isSaving ? 'pointer' : 'not-allowed',
            }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  // History view
  if (showHistory) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p
            className="text-xl"
            style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-secondary, #6B635A)' }}
          >
            edit history
          </p>
          <button
            onClick={() => setShowHistory(false)}
            className="text-sm text-charcoal/50 hover:text-charcoal transition-colors"
          >
            Back
          </button>
        </div>

        {edits.length === 0 ? (
          <p className="text-sm text-charcoal/30 text-center py-8">no edit history yet</p>
        ) : (
          <div className="space-y-3">
            {edits.map((edit) => (
              <div
                key={edit.id}
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'var(--surface-card, #F5F2ED)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {editorNames[edit.editor_id] && (
                    <span className="text-sm font-medium text-[#B8A99A]">
                      @{editorNames[edit.editor_id]}
                    </span>
                  )}
                  <span className="text-xs text-charcoal/30">
                    {formatTimeAgo(edit.created_at)}
                  </span>
                  <span className="flex-1" />
                  {user && (
                    <button
                      onClick={() => handleRestore(edit.previous_content)}
                      className="text-xs text-[#B8A99A] hover:underline"
                    >
                      Restore
                    </button>
                  )}
                </div>

                {edit.edit_summary && (
                  <p className="text-sm text-charcoal/50 italic mb-2">{edit.edit_summary}</p>
                )}

                <button
                  onClick={() => setExpandedEditId(expandedEditId === edit.id ? null : edit.id)}
                  className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors"
                >
                  {expandedEditId === edit.id ? 'hide changes' : 'show changes'}
                </button>

                {expandedEditId === edit.id && (
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="text-xs text-charcoal/40 mb-1">Previous:</p>
                      <p className="text-xs text-charcoal/60 p-2 rounded bg-red-50/50">{edit.previous_content}</p>
                    </div>
                    <div>
                      <p className="text-xs text-charcoal/40 mb-1">New:</p>
                      <p className="text-xs text-charcoal/60 p-2 rounded bg-green-50/50">{edit.new_content}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Empty state
  if (!background) {
    return (
      <div className="text-center py-16">
        <p
          className="text-xl mb-2"
          style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-secondary, #6B635A)' }}
        >
          no background yet
        </p>
        <p className="text-sm text-charcoal/30 mb-4">
          be the first to write about this song
        </p>
        {user ? (
          <button
            onClick={() => { setEditContent(''); setIsEditing(true) }}
            className="px-6 py-2 text-sm font-medium text-white rounded-lg transition-all"
            style={{ backgroundColor: '#B8A99A' }}
          >
            Write background
          </button>
        ) : (
          <p className="text-sm text-charcoal/30">Sign in to contribute</p>
        )}
      </div>
    )
  }

  // Read state
  return (
    <div>
      <p
        className="text-sm leading-relaxed mb-4"
        style={{ color: 'var(--text-primary, #2C2825)' }}
      >
        {background.content}
      </p>

      {/* Attribution */}
      <div className="flex items-center gap-1 text-xs text-charcoal/30 mb-4">
        {authorUsername && (
          <>
            <span>written by</span>
            <Link
              to={`/u/${authorUsername}`}
              className="text-[#B8A99A] hover:underline"
            >
              @{authorUsername}
            </Link>
          </>
        )}
        {background.updated_at !== background.created_at && (
          <span>· edited {formatTimeAgo(background.updated_at)}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {user && (
          <button
            onClick={() => { setEditContent(background.content); setEditSummary(''); setIsEditing(true) }}
            className="text-sm text-[#B8A99A] hover:underline"
          >
            Edit
          </button>
        )}
        <button
          onClick={async () => { await loadHistory(); setShowHistory(true) }}
          className="text-sm text-charcoal/40 hover:text-charcoal/60 transition-colors"
        >
          View history
        </button>
        <button
          onClick={() => setShowReport(true)}
          className="text-sm text-charcoal/40 hover:text-charcoal/60 transition-colors"
        >
          Report
        </button>
      </div>

      {showReport && (
        <ReportModal
          contentType="song_background"
          contentId={background.id}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}
