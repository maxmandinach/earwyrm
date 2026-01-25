import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLyric } from '../contexts/LyricContext'
import { supabase } from '../lib/supabase-wrapper'
import { isValidUsername, getPublicProfileUrl } from '../lib/utils'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const { user, profile, signOut, updateProfile } = useAuth()
  const { currentLyric, setVisibility } = useLyric()
  const navigate = useNavigate()

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [urlCopied, setUrlCopied] = useState(false)

  const publicUrl = getPublicProfileUrl(profile?.username)

  const handleUpdateUsername = async (e) => {
    e.preventDefault()
    setUsernameError('')
    setUsernameSuccess(false)

    if (!isValidUsername(username)) {
      setUsernameError('Username must be 3-20 characters, letters, numbers, and underscores only')
      return
    }

    if (username === profile?.username) {
      setUsernameError('This is already your username')
      return
    }

    setIsUpdatingUsername(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.toLowerCase() })
        .eq('id', user.id)

      if (error) {
        if (error.message?.includes('duplicate') || error.code === '23505') {
          setUsernameError('Username is already taken')
        } else {
          throw error
        }
      } else {
        setUsernameSuccess(true)
        // Refresh the page to update profile context
        setTimeout(() => window.location.reload(), 1000)
      }
    } catch (err) {
      console.error('Error updating username:', err)
      setUsernameError('Failed to update username')
    } finally {
      setIsUpdatingUsername(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (!currentPassword) {
      setPasswordError('Current password is required')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setIsUpdatingPassword(true)

    try {
      // Verify current password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })

      if (signInError) {
        setPasswordError('Current password is incorrect')
        setIsUpdatingPassword(false)
        return
      }

      // Update to new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('Error updating password:', err)
      setPasswordError(err.message || 'Failed to update password')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)

    try {
      // Delete user account (cascades to profile and lyrics via foreign keys)
      const { error } = await supabase.auth.admin.deleteUser(user.id)

      if (error) throw error

      // Sign out and redirect
      await signOut()
      navigate('/signup')
    } catch (err) {
      console.error('Error deleting account:', err)
      alert('Failed to delete account. Please contact support.')
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-xl font-light text-charcoal/60 tracking-wide lowercase mb-8">settings</h1>

        <div className="space-y-8">
          {/* Username */}
          <section className="border-b border-charcoal/10 pb-8">
            <h2 className="text-lg font-light text-charcoal mb-4 lowercase">username</h2>

            <form onSubmit={handleUpdateUsername} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-cream-dark border border-charcoal/20
                           text-charcoal focus:outline-none focus:border-charcoal/40"
                  placeholder="username"
                />
                <p className="mt-2 text-xs text-charcoal-light/60">
                  3-20 characters, letters, numbers, and underscores only
                </p>
              </div>

              {usernameError && (
                <p className="text-sm text-red-600">{usernameError}</p>
              )}

              {usernameSuccess && (
                <p className="text-sm text-green-600">Username updated! Refreshing...</p>
              )}

              <button
                type="submit"
                disabled={isUpdatingUsername || !username}
                className="px-6 py-2 text-sm font-medium text-charcoal
                         border border-charcoal/30 hover:border-charcoal/60
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
              >
                {isUpdatingUsername ? 'updating...' : 'update username'}
              </button>
            </form>
          </section>

          {/* Profile Visibility */}
          <section className="border-b border-charcoal/10 pb-8">
            <h2 className="text-lg font-light text-charcoal mb-4 lowercase">profile visibility</h2>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={async (e) => {
                    const newValue = e.target.checked
                    setIsPublic(newValue)
                    setIsUpdatingVisibility(true)
                    try {
                      await updateProfile({ is_public: newValue })
                      // If making profile public, also make current lyric public
                      if (newValue && currentLyric && !currentLyric.is_public) {
                        await setVisibility(true)
                      }
                    } catch (err) {
                      console.error('Error updating visibility:', err)
                      setIsPublic(!newValue) // revert on error
                    } finally {
                      setIsUpdatingVisibility(false)
                    }
                  }}
                  disabled={isUpdatingVisibility}
                  className="mt-1 w-4 h-4 accent-charcoal cursor-pointer"
                />
                <div>
                  <span className="text-sm text-charcoal group-hover:text-charcoal/80 transition-colors">
                    Make my profile public
                  </span>
                  <p className="text-xs text-charcoal-light/60 mt-1">
                    Your current lyric and note will appear on Explore and at your @username page.
                    New lyrics will automatically be public.
                  </p>
                </div>
              </label>

              {isPublic && (
                <div className="pl-7">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={publicUrl}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm bg-cream-dark border border-charcoal/20
                               text-charcoal"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="px-4 py-2 text-sm border border-charcoal/30
                               hover:border-charcoal/60 transition-colors"
                    >
                      {urlCopied ? 'copied!' : 'copy'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-charcoal-light/60">
                    Your public profile URL
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Email */}
          <section className="border-b border-charcoal/10 pb-8">
            <h2 className="text-lg font-light text-charcoal mb-4 lowercase">email</h2>

            <input
              type="email"
              value={user?.email || ''}
              readOnly
              className="w-full px-4 py-3 text-sm bg-cream-dark border border-charcoal/20
                       text-charcoal-light cursor-not-allowed"
            />
            <p className="mt-2 text-xs text-charcoal-light/60">
              Email cannot be changed at this time
            </p>
          </section>

          {/* Password */}
          <section className="border-b border-charcoal/10 pb-8">
            <h2 className="text-lg font-light text-charcoal mb-4 lowercase">change password</h2>

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div>
                <label className="block text-sm text-charcoal-light mb-2">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-cream-dark border border-charcoal/20
                           text-charcoal focus:outline-none focus:border-charcoal/40"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm text-charcoal-light mb-2">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-cream-dark border border-charcoal/20
                           text-charcoal focus:outline-none focus:border-charcoal/40"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm text-charcoal-light mb-2">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-cream-dark border border-charcoal/20
                           text-charcoal focus:outline-none focus:border-charcoal/40"
                  placeholder="Re-enter password"
                />
              </div>

              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}

              {passwordSuccess && (
                <p className="text-sm text-green-600">Password updated successfully!</p>
              )}

              <button
                type="submit"
                disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="px-6 py-2 text-sm font-medium text-charcoal
                         border border-charcoal/30 hover:border-charcoal/60
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
              >
                {isUpdatingPassword ? 'updating...' : 'update password'}
              </button>
            </form>
          </section>

          {/* Delete Account */}
          <section className="pb-8">
            <h2 className="text-lg font-light text-charcoal mb-4 lowercase">delete account</h2>

            {!showDeleteConfirm ? (
              <>
                <p className="text-sm text-charcoal-light mb-4">
                  Permanently delete your account and all your lyrics. This cannot be undone.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-6 py-2 text-sm font-medium text-red-600
                           border border-red-600/30 hover:border-red-600/60
                           transition-colors"
                >
                  delete account
                </button>
              </>
            ) : (
              <div className="bg-red-50 border border-red-200 p-6">
                <p className="text-sm text-red-800 font-medium mb-4">
                  Are you absolutely sure? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="px-6 py-2 text-sm font-medium text-cream bg-red-600
                             hover:bg-red-700 disabled:opacity-50
                             transition-colors"
                  >
                    {isDeleting ? 'deleting...' : 'yes, delete my account'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="px-6 py-2 text-sm text-charcoal-light hover:text-charcoal
                             border border-charcoal/20 hover:border-charcoal/40
                             disabled:opacity-50 transition-colors"
                  >
                    cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
