import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
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

export default function SharedLyric() {
  const { token } = useParams()
  const { user } = useAuth()
  const [lyric, setLyric] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isAnonymous = !user

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
          .select('username')
          .eq('id', lyricData.user_id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
        } else {
          setProfile(profileData)
        }
      } catch (err) {
        console.error('Error fetching shared lyric:', err)
        setError('Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchSharedLyric()
  }, [token])

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
          {user ? 'Go to your page' : 'Go to earwyrm'}
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
          {profile && (
            <Link
              to={`/@${profile.username}`}
              className="text-sm text-charcoal-light hover:text-charcoal transition-colors"
            >
              @{profile.username}
            </Link>
          )}

          {user && (
            <Link
              to="/home"
              className="text-sm text-charcoal-light hover:text-charcoal transition-colors"
            >
              Your page
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 pb-24">
        {lyric && <LyricCard lyric={lyric} showTimestamp={false} />}
      </main>

      {/* Signup banner for anonymous users */}
      {isAnonymous && <AnonymousSignupBanner />}
    </div>
  )
}
