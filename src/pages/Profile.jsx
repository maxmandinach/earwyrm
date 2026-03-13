import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLyric } from '../contexts/LyricContext'
import { useFollow } from '../contexts/FollowContext'
import { useBlock } from '../contexts/BlockContext'
import { useCollection } from '../contexts/CollectionContext'
import { supabase } from '../lib/supabase-wrapper'
import { isValidUsername, getPublicProfileUrl, formatRelativeTime } from '../lib/utils'
import { signatureStyle } from '../lib/themes'
import { setColorSchemePreference } from '../lib/paperTexture'
import { createCheckoutSession } from '../lib/card-art'
import NoteEditor from '../components/NoteEditor'
import PlusBadge from '../components/PlusBadge'
import PlusPaywall from '../components/PlusPaywall'

const TABS = [
  { key: 'lyrics', label: 'lyrics' },
  { key: 'collections', label: 'collections' },
  { key: 'settings', label: 'settings' },
]

// ── Profile Header ──
function ProfileHeader({ profile }) {
  const initial = (profile?.username || 'U')[0].toUpperCase()
  const isPlus = profile?.subscription_tier === 'plus'

  return (
    <div className="flex items-center gap-4 mb-8">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-medium ${
          isPlus ? 'ring-2 ring-offset-2' : ''
        }`}
        style={{
          backgroundColor: 'var(--color-accent, #B8A99A)',
          color: 'white',
          ...(isPlus ? { ringColor: 'var(--color-accent, #B8A99A)' } : {}),
        }}
      >
        {initial}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg text-charcoal font-medium">
            @{profile?.username || 'user'}
          </h1>
          {isPlus && <PlusBadge />}
        </div>
        {profile?.is_public && (
          <Link
            to={`/u/${profile.username}`}
            className="text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors"
          >
            view public profile
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Lyrics Tab ──
function LyricsTab() {
  const { user } = useAuth()
  const { currentLyric } = useLyric()
  const [lyrics, setLyrics] = useState([])
  const [notes, setNotes] = useState({})
  const [loading, setLoading] = useState(true)
  const theme = signatureStyle

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('lyrics')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_saved', false)

        if (error) {
          setLyrics([])
        } else {
          const realLyrics = data || []
          realLyrics.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          setLyrics(realLyrics)

          if (realLyrics.length > 0) {
            const { data: notesData } = await supabase
              .from('lyric_notes')
              .select('*')
              .eq('user_id', user.id)

            if (notesData) {
              const notesMap = {}
              notesData.forEach(note => { notesMap[note.lyric_id] = note })
              setNotes(notesMap)
            }
          }
        }
      } catch {
        setLyrics([])
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [user])

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-5" style={{ backgroundColor: 'var(--surface-card, #F5F2ED)', border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}>
            <div className="skeleton h-4 w-16 mb-3" />
            <div className="skeleton h-5 w-full mb-2" />
            <div className="skeleton h-5 w-3/4 mb-2" />
            <div className="skeleton h-3 w-32 mt-4" />
          </div>
        ))}
      </div>
    )
  }

  if (lyrics.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-charcoal/40 mb-2" style={{ fontFamily: "'Caveat', cursive", fontSize: '1.2rem' }}>
          Your moments will gather here
        </p>
        <p className="text-sm text-charcoal/30">
          Each lyric that moves through your mind leaves a trace
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {lyrics.map((lyric) => {
        const isCurrent = currentLyric && lyric.id === currentLyric.id
        const bgArt = lyric.card_art_url || lyric.cover_art_url
        const hasArt = !!bgArt
        const isAiArt = !!lyric.card_art_url
        return (
          <div
            key={lyric.id}
            className="relative overflow-hidden p-5"
            style={{
              backgroundColor: 'var(--surface-card, #F5F2ED)',
              boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08))',
              border: hasArt ? 'none' : '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
            }}
          >
            {/* Art background */}
            {hasArt && (
              <>
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${bgArt})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: isAiArt ? 0.7 : 0.12,
                  }}
                />
                {isAiArt && (
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.5))' }}
                  />
                )}
              </>
            )}

            {/* Content */}
            <div className="relative">
              {isCurrent && (
                <span
                  className="inline-block text-xs font-medium uppercase tracking-wider px-2 py-0.5 mb-3"
                  style={{
                    backgroundColor: isAiArt ? 'rgba(255,255,255,0.15)' : 'var(--color-accent, #B8A99A)',
                    color: isAiArt ? 'rgba(255,255,255,0.8)' : 'white',
                    fontSize: '0.65rem',
                    letterSpacing: '0.1em',
                  }}
                >
                  current
                </span>
              )}

              <blockquote
                className="leading-relaxed mb-3 line-clamp-4"
                style={{
                  fontFamily: theme.fontFamily,
                  fontSize: '1.3rem',
                  fontWeight: theme.fontWeight,
                  lineHeight: theme.lineHeight,
                  whiteSpace: 'pre-line',
                  ...(isAiArt ? { color: '#FAF8F5' } : {}),
                }}
              >
                {lyric.content}
              </blockquote>

              {(lyric.song_title || lyric.artist_name) && (
                <>
                  <div className="w-10 mt-3 mb-2" style={{ height: '1.5px', backgroundColor: isAiArt ? 'rgba(255,255,255,0.3)' : 'var(--color-accent, #B8A99A)', opacity: isAiArt ? 1 : 0.4 }} />
                  <div className="flex items-center gap-2">
                    {lyric.cover_art_url && (
                      <div
                        className="w-8 h-8 flex-shrink-0 rounded"
                        style={{
                          backgroundImage: `url(${lyric.cover_art_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                        }}
                      />
                    )}
                    <p className="text-xs italic truncate" style={{ color: isAiArt ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary, #6B635A)' }}>
                      {lyric.song_title}
                      {lyric.song_title && lyric.artist_name && ' — '}
                      {lyric.artist_name}
                    </p>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3 mt-3 pt-2" style={{ borderTop: `1px solid ${isAiArt ? 'rgba(255,255,255,0.1)' : 'var(--border-subtle, rgba(0,0,0,0.06))'}` }}>
                {(lyric.reaction_count || 0) > 0 && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: isAiArt ? 'rgba(255,255,255,0.4)' : 'var(--text-muted, #9C948A)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
                      {[{ x: 4, h: 6 }, { x: 8, h: 10 }, { x: 12, h: 14 }, { x: 16, h: 10 }, { x: 20, h: 6 }].map((bar, i) => (
                        <line key={i} x1={bar.x} y1={12 - bar.h / 2} x2={bar.x} y2={12 + bar.h / 2} stroke="currentColor" strokeWidth="2" />
                      ))}
                    </svg>
                    {lyric.reaction_count}
                  </span>
                )}
                {(lyric.comment_count || 0) > 0 && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: isAiArt ? 'rgba(255,255,255,0.4)' : 'var(--text-muted, #9C948A)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    {lyric.comment_count}
                  </span>
                )}
                {lyric.created_at && (
                  <span className="text-xs" style={{ color: isAiArt ? 'rgba(255,255,255,0.4)' : 'var(--text-muted, #9C948A)', opacity: isAiArt ? 1 : 0.6 }}>
                    {formatRelativeTime(lyric.created_at)}
                  </span>
                )}
                {lyric.tags && lyric.tags.length > 0 && (
                  <div className="flex gap-1.5 ml-auto">
                    {lyric.tags.map((tag, i) => (
                      <Link key={i} to={`/explore/tag/${encodeURIComponent(tag)}`} className="text-xs transition-colors" style={{ color: isAiArt ? 'rgba(255,255,255,0.3)' : 'var(--text-muted, #9C948A)', opacity: isAiArt ? 1 : 0.5 }}>
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {notes[lyric.id] && (
                <div className="mt-4">
                  <NoteEditor lyricId={lyric.id} initialNote={notes[lyric.id]} className="" />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Collections Tab ──
function CollectionsTab() {
  const { user, profile } = useAuth()
  const isPlus = profile?.subscription_tier === 'plus'
  const { collections, loading, createCollection, updateCollection, deleteCollection, getAllUserTags } = useCollection()
  const [lyricCounts, setLyricCounts] = useState({})
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [editingCollection, setEditingCollection] = useState(null)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionDescription, setNewCollectionDescription] = useState('')
  const [isSmart, setIsSmart] = useState(false)
  const [smartTag, setSmartTag] = useState('')
  const [allTags, setAllTags] = useState([])
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    async function fetchLyricCounts() {
      if (!collections || collections.length === 0) { setLoadingCounts(false); return }
      setLoadingCounts(true)
      const counts = {}
      const smartCollections = collections.filter(c => c.is_smart)
      const manualCollections = collections.filter(c => !c.is_smart)
      const promises = []

      if (smartCollections.length > 0) {
        promises.push(
          supabase.from('lyrics').select('id, tags').eq('user_id', user.id)
            .then(({ data, error }) => {
              for (const c of smartCollections) {
                counts[c.id] = error ? 0 : (data?.filter(l => l.tags?.includes(c.smart_tag))?.length || 0)
              }
            })
        )
      }
      for (const c of manualCollections) {
        promises.push(
          supabase.from('lyric_collections').select('id').eq('collection_id', c.id)
            .then(({ data, error }) => { counts[c.id] = error ? 0 : (data?.length || 0) })
        )
      }
      await Promise.all(promises)
      setLyricCounts(counts)
      setLoadingCounts(false)
    }
    fetchLyricCounts()
  }, [collections, user?.id])

  useEffect(() => {
    async function fetchTags() { setAllTags(await getAllUserTags()) }
    fetchTags()
  }, [getAllUserTags])

  function handleEdit(collection) {
    setEditingCollection(collection)
    setNewCollectionName(collection.name)
    setNewCollectionDescription(collection.description || '')
    setIsSmart(collection.is_smart || false)
    setSmartTag(collection.smart_tag || '')
    setShowCreateForm(true)
  }

  async function handleDelete(collectionId) {
    try { await deleteCollection(collectionId) } catch { alert('Failed to delete collection.') }
  }

  async function handleCreateCollection(e) {
    e.preventDefault()
    if (!newCollectionName.trim() || (isSmart && !smartTag.trim())) return
    setIsCreating(true)
    try {
      if (editingCollection) {
        await updateCollection(editingCollection.id, { name: newCollectionName.trim(), description: newCollectionDescription.trim(), is_smart: isSmart, smart_tag: isSmart ? smartTag.trim() : null })
        setEditingCollection(null)
      } else {
        await createCollection({ name: newCollectionName.trim(), description: newCollectionDescription.trim(), isSmart, smartTag: isSmart ? smartTag.trim() : null })
      }
      setNewCollectionName(''); setNewCollectionDescription(''); setIsSmart(false); setSmartTag(''); setShowCreateForm(false)
    } catch { alert('Failed to save collection.') } finally { setIsCreating(false) }
  }

  function handleCancelForm() {
    setShowCreateForm(false); setEditingCollection(null); setNewCollectionName(''); setNewCollectionDescription(''); setIsSmart(false); setSmartTag('')
  }

  if (loading || loadingCounts) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-5" style={{ backgroundColor: 'var(--surface-card, #F5F2ED)', border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}>
            <div className="skeleton h-5 w-28 mb-2" />
            <div className="skeleton h-4 w-40 mb-4" />
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-charcoal/40">Organize your lyrics by theme, mood, or any way you like</p>
        <button
          onClick={() => {
            if (showCreateForm) handleCancelForm()
            else if (!isPlus) setShowPaywall(true)
            else setShowCreateForm(true)
          }}
          className="text-xs text-charcoal/40 hover:text-charcoal/60 transition-colors"
        >
          {showCreateForm ? 'cancel' : '+ new'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateCollection} className="mb-6 p-5" style={{ backgroundColor: 'var(--surface-card, #F5F2ED)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}>
          <h3 className="text-sm text-charcoal/40 mb-4 lowercase">{editingCollection ? 'edit collection' : 'new collection'}</h3>
          <div className="space-y-3">
            <input type="text" value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} placeholder="Collection name" className="w-full px-3 py-2 text-sm bg-transparent border border-charcoal/10 focus:border-charcoal/30 focus:outline-none placeholder:text-charcoal/30 text-charcoal" autoFocus />
            <textarea value={newCollectionDescription} onChange={(e) => setNewCollectionDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full px-3 py-2 text-sm bg-transparent border border-charcoal/10 focus:border-charcoal/30 focus:outline-none resize-none placeholder:text-charcoal/30 text-charcoal" />
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <span onClick={() => setIsSmart(!isSmart)} className={`w-4 h-4 border flex items-center justify-center transition-colors cursor-pointer ${isSmart ? 'border-charcoal/40 bg-charcoal/10' : 'border-charcoal/15'}`}>
                  {isSmart && <span className="text-charcoal/60 text-xs">✓</span>}
                </span>
                <span className="text-xs text-charcoal/40">Smart collection (auto-populate from tag)</span>
              </label>
            </div>
            {isSmart && (
              <div>
                <label className="text-xs text-charcoal/30 mb-1.5 block">Tag to filter by</label>
                {allTags.length > 0 ? (
                  <select value={smartTag} onChange={(e) => setSmartTag(e.target.value)} className="w-full px-3 py-2 text-sm bg-transparent border border-charcoal/10 focus:border-charcoal/30 focus:outline-none text-charcoal">
                    <option value="">Select a tag...</option>
                    {allTags.map(tag => <option key={tag} value={tag}>#{tag}</option>)}
                  </select>
                ) : <p className="text-xs text-charcoal/30 italic">No tags found. Add tags to your lyrics first.</p>}
              </div>
            )}
            <button type="submit" disabled={!newCollectionName.trim() || (isSmart && !smartTag.trim()) || isCreating} className="px-4 py-2 text-xs text-charcoal/50 border border-charcoal/15 hover:border-charcoal/40 hover:text-charcoal/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              {isCreating ? 'saving...' : (editingCollection ? 'update' : 'create')}
            </button>
          </div>
        </form>
      )}

      {collections.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-charcoal/40 mb-2">No collections yet</p>
          <p className="text-sm text-charcoal/30">Collections help you organize your lyrics by theme, mood, or any way you like.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {collections.map(collection => (
            <div key={collection.id} className="relative">
              <Link to={`/collections/${collection.id}`} className="block p-5 transition-all group" style={{ backgroundColor: 'var(--surface-card, #F5F2ED)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base text-charcoal/70 group-hover:text-charcoal transition-colors">{collection.name}</h3>
                    {collection.description && <p className="text-sm text-charcoal/40 mt-1 line-clamp-2">{collection.description}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 mt-3" style={{ borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}>
                  <span className="text-xs text-charcoal/30">{lyricCounts[collection.id] || 0} {(lyricCounts[collection.id] || 0) === 1 ? 'lyric' : 'lyrics'}</span>
                  {collection.is_smart && <span className="text-xs text-charcoal/30 italic">#{collection.smart_tag}</span>}
                </div>
              </Link>
              <div className="absolute top-4 right-4 flex gap-1">
                <button onClick={() => handleEdit(collection)} className="text-xs text-charcoal/20 hover:text-charcoal/40 transition-colors p-1">edit</button>
                <button onClick={() => { if (confirm(`Delete "${collection.name}"?`)) handleDelete(collection.id) }} className="text-xs text-charcoal/20 hover:text-charcoal/40 transition-colors p-1">delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPaywall && <PlusPaywall onClose={() => setShowPaywall(false)} />}
    </>
  )
}

// ── Settings Tab ──
function SettingsTab() {
  const { user, profile, updateProfile, refreshProfile, signOut } = useAuth()
  const { currentLyric, setVisibility } = useLyric()
  const { follows } = useFollow()
  const { blockedUserIds, unblockUser } = useBlock()
  const [searchParams] = useSearchParams()
  const [blockedProfiles, setBlockedProfiles] = useState([])
  const [subscribeLoading, setSubscribeLoading] = useState(null)
  const [subscribeError, setSubscribeError] = useState('')
  const [justSubscribed, setJustSubscribed] = useState(false)

  const isPlus = profile?.subscription_tier === 'plus'
  const isWebSubscriber = profile?.subscription_platform === 'web'

  useEffect(() => {
    if (searchParams.get('subscribed') === 'true') {
      setJustSubscribed(true)
      refreshProfile?.()
      setTimeout(() => setJustSubscribed(false), 5000)
    }
  }, [searchParams])

  const handleSubscribe = async (plan) => {
    setSubscribeLoading(plan)
    setSubscribeError('')
    try {
      const session = await supabase.auth.getSession()
      const accessToken = session?.data?.session?.access_token
      if (!accessToken) throw new Error('Not signed in')
      const url = await createCheckoutSession(plan, accessToken)
      window.location.href = url
    } catch (err) {
      setSubscribeError(err.message || 'Something went wrong')
      setSubscribeLoading(null)
    }
  }

  const [username, setUsername] = useState(profile?.username || '')
  const [isPublic, setIsPublic] = useState(profile?.is_public || false)
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [usernameSuccess, setUsernameSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)

  const [themePreference, setThemePreference] = useState(() => localStorage.getItem('earwyrm-theme') || 'auto')
  const [musicService, setMusicService] = useState(() => localStorage.getItem('earwyrm-music-service') || 'spotify')

  const handleMusicServiceChange = (service) => { setMusicService(service); localStorage.setItem('earwyrm-music-service', service) }
  const handleThemeChange = (preference) => { setThemePreference(preference); setColorSchemePreference(preference) }

  useEffect(() => {
    async function fetchBlockedProfiles() {
      const ids = [...blockedUserIds]
      if (ids.length === 0) { setBlockedProfiles([]); return }
      const { data } = await supabase.from('profiles').select('id, username').in('id', ids)
      setBlockedProfiles(data || [])
    }
    fetchBlockedProfiles()
  }, [blockedUserIds])

  const publicUrl = getPublicProfileUrl(profile?.username)

  const handleUpdateUsername = async (e) => {
    e.preventDefault()
    setUsernameError(''); setUsernameSuccess(false)
    if (!isValidUsername(username)) { setUsernameError('Username must be 3-20 characters, letters, numbers, and underscores only'); return }
    if (username === profile?.username) { setUsernameError('This is already your username'); return }
    setIsUpdatingUsername(true)
    try {
      const { error } = await supabase.from('profiles').update({ username: username.toLowerCase() }).eq('id', user.id)
      if (error) {
        if (error.message?.includes('duplicate') || error.code === '23505') setUsernameError('Username is already taken')
        else throw error
      } else { setUsernameSuccess(true); setTimeout(() => window.location.reload(), 1000) }
    } catch { setUsernameError('Failed to update username') } finally { setIsUpdatingUsername(false) }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setPasswordError(''); setPasswordSuccess(false)
    if (!currentPassword) { setPasswordError('Current password is required'); return }
    if (newPassword.length < 6) { setPasswordError('New password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return }
    setIsUpdatingPassword(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
      if (signInError) { setPasswordError('Current password is incorrect'); setIsUpdatingPassword(false); return }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordSuccess(true); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (err) { setPasswordError(err.message || 'Failed to update password') } finally { setIsUpdatingPassword(false) }
  }

  const handleCopyUrl = async () => {
    try { await navigator.clipboard.writeText(publicUrl); setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000) } catch {}
  }

  return (
    <div className="space-y-8">
      {/* Subscription */}
      <section className="border-b border-charcoal/10 pb-8">
        <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-4">earwyrm+</h2>
        {justSubscribed && (
          <div className="mb-4 p-3 text-sm text-center" style={{ backgroundColor: 'var(--accent, #B8A99A)', color: 'white', borderRadius: '8px' }}>
            Welcome to earwyrm+! You're all set.
          </div>
        )}
        {isPlus ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary, #2C2825)' }}>earwyrm+ active</p>
                <p className="text-xs" style={{ color: 'var(--text-muted, #9E9589)' }}>thank you for your support</p>
              </div>
              <span style={{ color: 'var(--accent, #B8A99A)', fontSize: '1.25rem' }}>✓</span>
            </div>
            {isWebSubscriber && <p className="text-xs" style={{ color: 'var(--text-muted, #9E9589)' }}>Subscribed via web. Manage your subscription through Stripe.</p>}
            {!isWebSubscriber && profile?.subscription_platform === 'ios' && <p className="text-xs" style={{ color: 'var(--text-muted, #9E9589)' }}>Subscribed via iOS. Manage in the App Store.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--text-secondary, #6B635A)' }}>Unlock AI lyric art, unlimited collections, and more.</p>
            <div className="flex gap-2">
              <button onClick={() => handleSubscribe('monthly')} disabled={!!subscribeLoading} className="flex-1 px-4 py-3 text-sm font-medium border transition-colors" style={{ borderColor: 'var(--border-medium, rgba(0,0,0,0.1))', color: 'var(--text-primary, #2C2825)', opacity: subscribeLoading === 'yearly' ? 0.5 : 1 }}>
                {subscribeLoading === 'monthly' ? '...' : '$2.99/mo'}
              </button>
              <button onClick={() => handleSubscribe('yearly')} disabled={!!subscribeLoading} className="flex-1 px-4 py-3 text-sm font-medium transition-colors" style={{ backgroundColor: 'var(--accent, #B8A99A)', color: 'white', border: 'none', opacity: subscribeLoading === 'monthly' ? 0.5 : 1 }}>
                {subscribeLoading === 'yearly' ? '...' : '$24.99/yr (save 30%)'}
              </button>
            </div>
            {subscribeError && <p className="text-xs text-red-600">{subscribeError}</p>}
          </div>
        )}
      </section>

      {/* Username */}
      <section className="border-b border-charcoal/10 pb-8">
        <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-4">username</h2>
        <form onSubmit={handleUpdateUsername} className="space-y-3">
          <div>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 text-sm bg-cream-dark border border-charcoal/20 text-charcoal focus:outline-none focus:border-charcoal/40" placeholder="username" />
            <p className="mt-2 text-xs text-charcoal/30">3-20 characters, letters, numbers, and underscores only</p>
          </div>
          {usernameError && <p className="text-sm text-red-600">{usernameError}</p>}
          {usernameSuccess && <p className="text-sm text-green-600">Username updated! Refreshing...</p>}
          <button type="submit" disabled={isUpdatingUsername || !username} className="px-6 py-2 text-sm font-medium text-charcoal border border-charcoal/30 hover:border-charcoal/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {isUpdatingUsername ? 'updating...' : 'update username'}
          </button>
        </form>
      </section>

      {/* Profile Visibility */}
      <section className="border-b border-charcoal/10 pb-8">
        <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-4">profile visibility</h2>
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" checked={isPublic} onChange={async (e) => {
              const newValue = e.target.checked
              setIsPublic(newValue); setIsUpdatingVisibility(true)
              try {
                await updateProfile({ is_public: newValue })
                if (newValue && currentLyric && !currentLyric.is_public) await setVisibility(true)
              } catch { setIsPublic(!newValue) } finally { setIsUpdatingVisibility(false) }
            }} disabled={isUpdatingVisibility} className="mt-1 w-4 h-4 accent-charcoal cursor-pointer" />
            <div>
              <span className="text-sm text-charcoal group-hover:text-charcoal/80 transition-colors">Make my profile public</span>
              <p className="text-xs text-charcoal/30 mt-1">Your current lyric and note will appear on Explore and at your @username page.</p>
            </div>
          </label>
          {isPublic && (
            <div className="pl-7">
              <div className="flex gap-2">
                <input type="text" value={publicUrl} readOnly className="flex-1 px-3 py-2 text-sm bg-cream-dark border border-charcoal/20 text-charcoal" />
                <button onClick={handleCopyUrl} className="px-4 py-2 text-sm border border-charcoal/30 hover:border-charcoal/60 transition-colors">{urlCopied ? 'copied!' : 'copy'}</button>
              </div>
              <p className="mt-2 text-xs text-charcoal/30">Your public profile URL</p>
            </div>
          )}
        </div>
      </section>

      {/* Following */}
      <section className="border-b border-charcoal/10 pb-8">
        <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-4">following</h2>
        <Link to="/following" className="text-sm hover:text-charcoal transition-colors" style={{ color: 'var(--text-secondary, #6B635A)' }}>
          Manage what you follow ({follows.length})
        </Link>
      </section>

      {/* Blocked Users */}
      {blockedUserIds.size > 0 && (
        <section className="border-b border-charcoal/10 pb-8">
          <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-4">blocked users ({blockedUserIds.size})</h2>
          <div className="space-y-2">
            {blockedProfiles.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2">
                <Link to={`/u/${p.username}`} className="text-sm hover:text-charcoal transition-colors" style={{ color: 'var(--text-secondary, #6B635A)' }}>@{p.username}</Link>
                <button onClick={() => unblockUser(p.id)} className="text-xs px-3 py-1 border border-charcoal/20 hover:border-charcoal/40 text-charcoal/50 hover:text-charcoal transition-colors rounded-full">Unblock</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Appearance */}
      <section className="border-b border-charcoal/10 pb-8">
        <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-4">appearance</h2>
        <div className="space-y-3">
          {[{ value: 'auto', label: 'Auto', desc: 'Match your system preference' }, { value: 'light', label: 'Light', desc: 'Warm cream tones' }, { value: 'dark', label: 'Dark', desc: 'Easy on the eyes at night' }].map(({ value, label, desc }) => (
            <label key={value} className="flex items-center gap-3 cursor-pointer group">
              <input type="radio" name="theme" value={value} checked={themePreference === value} onChange={() => handleThemeChange(value)} className="w-4 h-4 accent-charcoal cursor-pointer" />
              <div>
                <span className="text-sm text-charcoal group-hover:text-charcoal/80 transition-colors">{label}</span>
                <p className="text-xs text-charcoal/30">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Music Service */}
      <section className="border-b border-charcoal/10 pb-8">
        <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-4">music service</h2>
        <div className="space-y-3">
          {[{ value: 'spotify', label: 'Spotify', color: '#1DB954' }, { value: 'apple_music', label: 'Apple Music', color: '#FC3C44' }, { value: 'youtube_music', label: 'YouTube Music', color: '#FF0000' }].map(({ value, label, color }) => (
            <label key={value} className="flex items-center gap-3 cursor-pointer group">
              <input type="radio" name="musicService" value={value} checked={musicService === value} onChange={() => handleMusicServiceChange(value)} className="w-4 h-4 accent-charcoal cursor-pointer" />
              <span className="text-sm group-hover:opacity-80 transition-opacity font-medium" style={{ color }}>{label}</span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-charcoal/30">Song pages will link to your preferred service</p>
      </section>

      {/* Email */}
      <section className="border-b border-charcoal/10 pb-8">
        <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-4">email</h2>
        <input type="email" value={user?.email || ''} readOnly className="w-full px-4 py-3 text-sm bg-cream-dark border border-charcoal/20 text-charcoal/40 cursor-not-allowed" />
        <p className="mt-2 text-xs text-charcoal/30">Email cannot be changed at this time</p>
      </section>

      {/* Password */}
      <section className="border-b border-charcoal/10 pb-8">
        <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-4">change password</h2>
        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <div>
            <label className="block text-sm text-charcoal/40 mb-2">Current password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-3 text-sm bg-cream-dark border border-charcoal/20 text-charcoal focus:outline-none focus:border-charcoal/40" placeholder="Enter current password" />
          </div>
          <div>
            <label className="block text-sm text-charcoal/40 mb-2">New password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 text-sm bg-cream-dark border border-charcoal/20 text-charcoal focus:outline-none focus:border-charcoal/40" placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="block text-sm text-charcoal/40 mb-2">Confirm new password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 text-sm bg-cream-dark border border-charcoal/20 text-charcoal focus:outline-none focus:border-charcoal/40" placeholder="Re-enter password" />
          </div>
          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          {passwordSuccess && <p className="text-sm text-green-600">Password updated successfully!</p>}
          <button type="submit" disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword} className="px-6 py-2 text-sm font-medium text-charcoal border border-charcoal/30 hover:border-charcoal/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {isUpdatingPassword ? 'updating...' : 'update password'}
          </button>
        </form>
      </section>

      {/* Admin */}
      {profile?.is_admin && (
        <section className="border-b border-charcoal/10 pb-8">
          <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-4">admin</h2>
          <Link to="/admin" className="text-sm hover:underline" style={{ color: 'var(--accent, #B8A99A)' }}>moderation dashboard</Link>
        </section>
      )}

      {/* Delete Account */}
      <section className="border-b border-charcoal/10 pb-8">
        <h2 className="text-xs text-charcoal/30 uppercase tracking-wider mb-4">delete account</h2>
        <p className="text-sm text-charcoal/40 mb-4">To delete your account and all your lyrics, contact us.</p>
        <button onClick={() => { window.location.href = 'mailto:support@earwyrm.app?subject=Delete%20my%20account&body=Please%20delete%20my%20account.%20My%20username%20is%20' + (profile?.username || '') }} className="px-6 py-2 text-sm font-medium text-red-600 border border-red-600/30 hover:border-red-600/60 transition-colors">
          request account deletion
        </button>
      </section>

      {/* Sign Out */}
      <section className="pb-8">
        <button onClick={signOut} className="px-6 py-2 text-sm text-charcoal/40 hover:text-charcoal transition-colors">
          sign out
        </button>
      </section>
    </div>
  )
}

// ── Profile Page ──
export default function Profile() {
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'lyrics'

  function setTab(tab) {
    setSearchParams({ tab }, { replace: true })
  }

  return (
    <div className="flex-1 flex flex-col px-4 py-8">
      <div className="max-w-lg mx-auto w-full">
        <ProfileHeader profile={profile} />

        {/* Tab bar */}
        <div className="flex gap-6 mb-8 border-b border-charcoal/10">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-2.5 text-sm transition-colors relative ${
                activeTab === key
                  ? 'text-charcoal/70'
                  : 'text-charcoal/30 hover:text-charcoal/50'
              }`}
            >
              {label}
              {activeTab === key && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-charcoal/40" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'lyrics' && <LyricsTab />}
        {activeTab === 'collections' && <CollectionsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}
