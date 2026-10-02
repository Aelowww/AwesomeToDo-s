import { useCallback, useEffect, useState } from 'react'
import { auth, isConnectionError } from './api'
import AuthScreen from './components/AuthScreen'
import LoadingScreen from './components/LoadingScreen'
import ResetPasswordScreen from './components/ResetPasswordScreen'
import Planner from './Planner'

export default function App() {
  // undefined = still checking, null = signed out
  const [user, setUser] = useState(undefined)
  const [isNewUser, setIsNewUser] = useState(false)
  const [bootError, setBootError] = useState('')
  // A password reset link looks like /?reset=TOKEN.
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get('reset'))

  const leaveReset = () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    setResetToken(null)
  }

  const checkSession = useCallback(() => {
    auth.me()
      .then((me) => {
        setBootError('')
        setUser(me)
      })
      .catch((err) => {
        // Can't reach the server: say so instead of pretending the user is signed out.
        if (isConnectionError(err)) setBootError(err.message)
        else setUser(null)
      })
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const retry = () => {
    setBootError('')
    checkSession()
  }

  const signIn = (signedIn, { isNew = false } = {}) => {
    setIsNewUser(isNew)
    setUser(signedIn)
  }

  const signOut = async () => {
    await auth.logout().catch(() => {})
    setIsNewUser(false)
    setUser(null)
  }

  const sessionExpired = useCallback(() => setUser(null), [])

  if (resetToken) {
    return (
      <ResetPasswordScreen
        token={resetToken}
        onDone={(signedIn) => {
          leaveReset()
          signIn(signedIn)
        }}
        onCancel={leaveReset}
      />
    )
  }
  if (bootError) return <LoadingScreen error={bootError} onRetry={retry} />
  if (user === undefined) return <LoadingScreen message="Checking your account..." />
  if (!user) return <AuthScreen onSignedIn={signIn} />

  return (
    <Planner
      key={user.id}
      user={user}
      isNewUser={isNewUser}
      onSignOut={signOut}
      onSessionExpired={sessionExpired}
      onUserChange={setUser}
    />
  )
}
