import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'
import LyricCard from '../components/LyricCard'

function AnonymousFooter({ username }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-transparent border-t border-charcoal/10 py-4 px-6 z-20">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
        <p className="text-sm text-charcoal/50">
          Save the lyrics that stay with you
        </p>
        <Link
          to="/signup"
          className="text-sm text-charcoal font-medium hover:text-charcoal/70 transition-colors"
        >
          Sign up
        </Link>
      </div>
    </div>
  )
}

export default function SharedLyric() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [lyric, setLyric] = useState(null)
  const [note, setNote] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isAnonymous = !user
  // Only show note if sharer opted in via ?n=1 parameter
  const showNote = searchParams.get('n') === '1'

  useEffect(() => {
    async function fetchSharedLyric() {
      try {
        // Fetch lyric by share token
        const { data: lyricData, error: lyricError } = await supabase
          .from('lyrics')
          .select('*')
          .eq('share_token', token)
          .single()

        if (lyricError) {
          if (lyricError.code === 'PGRST116') {
            setError('Lyric not found')
          } else {
            throw lyricError
          }
          return
        }

        setLyric(lyricData)

        // Fetch profile info for attribution
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, is_public')
          .eq('id', lyricData.user_id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
        } else {
          setProfile(profileData)
        }

        // Only fetch note if sharer included it
        if (showNote) {
          const { data: noteData, error: noteError } = await supabase
            .from('lyric_notes')
            .select('*')
            .eq('lyric_id', lyricData.id)
            .single()

          if (noteError && noteError.code !== 'PGRST116') {
            console.error('Error fetching note:', noteError)
          } else if (noteData) {
            setNote(noteData)
          }
        }
      } catch (err) {
        console.error('Error fetching shared lyric:', err)
        setError('Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchSharedLyric()
  }, [token, showNote])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-charcoal-light text-sm">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent px-4">
        <p className="text-charcoal mb-4">{error}</p>
        <Link
          to={user ? "/home" : "/"}
          className="text-sm text-charcoal-light underline hover:no-underline"
        >
          {user ? 'Go to your page' : 'Explore lyrics'}
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      {/* Header */}
      <header className="px-4 py-4 flex justify-between items-center">
        <Link
          to={user ? "/home" : "/"}
          className="hover:opacity-70 transition-opacity"
          style={{ fontFamily: "'Caveat', cursive", fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary, #2C2825)' }}
        >
          earwyrm
        </Link>

        <div className="flex items-center gap-4">
          {profile && (
            <Link
              to={`/@${profile.username}`}
              className="text-sm text-charcoal/40 hover:text-charcoal/60 transition-colors"
            >
              @{profile.username}
            </Link>
          )}

          {user && (
            <Link
              to="/home"
              className="text-sm text-charcoal/40 hover:text-charcoal/60 transition-colors"
            >
              Your page
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 pb-24">
        <div className="w-full max-w-lg">
          {lyric && (
            <LyricCard
              lyric={lyric}
              showTimestamp={false}
              linkable
              showActions
              isAnon={isAnonymous}
              isOwn={user?.id === lyric.user_id}
              notes={note ? [note] : undefined}
              username={profile?.username}
              profileIsPublic={profile?.is_public}
            />
          )}
        </div>
      </main>

      {/* Footer for anonymous users */}
      {isAnonymous && <AnonymousFooter username={profile?.username} />}
    </div>
  )
}
