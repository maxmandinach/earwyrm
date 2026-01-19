import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase-wrapper'
import { useAuth } from '../contexts/AuthContext'
import LyricCard from '../components/LyricCard'

function AnonymousSignupBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-charcoal/95 backdrop-blur-sm border-t border-charcoal/20 py-4 px-6 z-20">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <p className="text-sm text-cream/90">
          Create your own lyric on earwyrm
        </p>
        <Link
          to="/signup"
          className="text-sm text-cream font-medium hover:text-cream/80 transition-colors underline"
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
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-charcoal-light text-sm">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-4">
        <p className="text-charcoal mb-4">{error}</p>
        <Link
          to={user ? "/home" : "/"}
          className="text-sm text-charcoal-light underline hover:no-underline"
        >
          {user ? 'Go to your page' : 'Go home'}
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* Header */}
      <header className="px-4 py-4 flex justify-between items-center">
        <Link
          to={user ? "/home" : "/"}
          className="text-charcoal font-medium tracking-tight hover:opacity-70 transition-opacity"
        >
          earwyrm
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-sm text-charcoal-light">@{username}</span>

          {user && (
            <button
              onClick={() => navigate('/home')}
              className="text-sm text-charcoal-light hover:text-charcoal transition-colors"
            >
              Your page
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 pb-24">
        {isPrivate ? (
          <div className="text-center max-w-md">
            <p className="text-lg text-charcoal mb-2">This lyric is private</p>
            <p className="text-sm text-charcoal-light">
              @{username} hasn't made their current lyric visible yet
            </p>
          </div>
        ) : lyric ? (
          <LyricCard lyric={lyric} showTimestamp={true} />
        ) : (
          <div className="text-center max-w-md">
            <p className="text-charcoal-light">
              @{username} hasn't shared a lyric yet
            </p>
          </div>
        )}
      </main>

      {/* Signup banner for anonymous users */}
      {isAnonymous && <AnonymousSignupBanner />}
    </div>
  )
}
