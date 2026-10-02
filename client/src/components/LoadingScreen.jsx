// Full-screen loading state with the mascot. With `error` and `onRetry` it becomes a
// "can't connect" screen instead.
export default function LoadingScreen({ message = 'Getting your planner ready...', error, onRetry }) {
  return (
    <main className={`loading-screen${error ? ' is-error' : ''}`} aria-busy={!error} aria-live="polite">
      <div className="loading-screen__glow" aria-hidden="true" />
      <img className="loading-screen__logo" src="/logo-480.png" alt="" width="168" height="168" />
      <p className="loading-screen__name">Awesome ToDo's</p>

      {error ? (
        <>
          <p className="loading-screen__msg">{error}</p>
          <button type="button" className="btn btn--primary" onClick={onRetry}>Try again</button>
        </>
      ) : (
        <>
          <div className="loading-bar" aria-hidden="true"><span /></div>
          <p className="loading-screen__msg">{message}</p>
        </>
      )}
    </main>
  )
}
