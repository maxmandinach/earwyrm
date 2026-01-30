import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'
import LyricCard from '../components/LyricCard'

function AnonymousFooter() {
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

export default function PublicProfile({ showHistory = false }) {
  const { username } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [lyric, setLyric] = useState(null)
  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isPrivate, setIsPrivate] = useState(false)

  const isAnonymous = !user

  useEffect(() => {
    async function fetchProfile() {
      try {
        // Fetch profile by username
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username.toLowerCase())
          .single()

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            setError('User not found')
          } else {
            throw profileError
          }
          return
        }

        setProfile(profileData)

        // Fetch current lyric (check both public and private to know state)
        const { data: lyricData, error: lyricError } = await supabase
          .from('lyrics')
          .select('*')
          .eq('user_id', profileData.id)
          .eq('is_current', true)
          .single()

        if (lyricError && lyricError.code !== 'PGRST116') {
          throw lyricError
        }

        if (lyricData) {
          if (lyricData.is_public) {
            setLyric(lyricData)

            // Fetch public note for this lyric
            const { data: noteData, error: noteError } = await supabase
              .from('lyric_notes')
              .select('*')
              .eq('lyric_id', lyricData.id)
              .eq('is_public', true)
              .single()

            if (noteError && noteError.code !== 'PGRST116') {
              console.error('Error fetching note:', noteError)
            } else if (noteData) {
              setNote(noteData)
            }
          } else {
            setIsPrivate(true)
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [username])

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
      {/* Minimal header */}
      <header className="px-4 py-4 flex justify-between items-center">
        <Link
          to={user ? "/home" : "/"}
          className="hover:opacity-70 transition-opacity"
          style={{ fontFamily: "'Caveat', cursive", fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary, #2C2825)' }}
        >
          earwyrm
        </Link>

        {user && (
          <Link
            to="/home"
            className="text-sm text-charcoal/40 hover:text-charcoal/60 transition-colors"
          >
            Your page
          </Link>
        )}
      </header>

      {/* Main Content - artifact-first */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 pb-24">
        {isPrivate ? (
          <div className="text-center max-w-md">
            <p className="text-lg text-charcoal mb-2">This lyric is private</p>
            <p className="text-sm text-charcoal-light">
              @{username} hasn't made their current lyric visible yet
            </p>
          </div>
        ) : lyric ? (
          <div className="w-full max-w-lg">
            <LyricCard lyric={lyric} showTimestamp={true} linkable />

            {/* Note displayed like marginalia */}
            {note && (
              <div
                className="mt-8 pl-4 border-l-2 border-charcoal/10"
                style={{
                  transform: 'rotate(-0.5deg)',
                  transformOrigin: 'left top',
                }}
              >
                <p
                  className="text-charcoal/50 leading-relaxed"
                  style={{ fontFamily: "'Caveat', cursive", fontSize: '1.25rem' }}
                >
                  {note.content}
                </p>
              </div>
            )}

            {/* Subtle attribution */}
            <div className="mt-8 text-center">
              <p className="text-xs text-charcoal/30">
                @{username}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center max-w-md">
            <p className="text-charcoal-light">
              @{username} hasn't shared a lyric yet
            </p>
          </div>
        )}
      </main>

      {/* Footer for anonymous users */}
      {isAnonymous && <AnonymousFooter />}
    </div>
  )
}
