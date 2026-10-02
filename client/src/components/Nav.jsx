import AccountMenu from './AccountMenu'
import Icon from './Icon'

// Tasks includes the calendar view and Classes includes grades, so phones only need four items.
const NAV_ITEMS = [
  { page: 'home', pages: ['home'], label: 'Home', icon: 'home' },
  { page: 'tasks', pages: ['tasks', 'calendar'], label: 'Tasks', icon: 'tasks' },
  { page: 'classes', pages: ['classes', 'grades'], label: 'Classes', icon: 'classes' },
  { page: 'focus', pages: ['focus'], label: 'Focus', icon: 'focus', desktopOnly: true },
  { page: 'profile', pages: ['profile'], label: 'Profile', icon: 'user' },
]

const formatTime = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

function Brand({ onClick }) {
  return (
    <a
      href="#/home"
      className="brand"
      onClick={(event) => {
        event.preventDefault()
        onClick()
      }}
    >
      <img className="brand__logo" src="/logo-192.png" alt="" width="40" height="40" />
      <span className="brand__name">Awesome ToDo's</span>
    </a>
  )
}

export function ThemeToggle({ theme, onChange }) {
  const dark = theme === 'dark'
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => onChange(dark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
    >
      <span className="theme-toggle__icon" key={dark ? 'moon' : 'sun'}>
        <Icon name={dark ? 'moon' : 'sun'} size={18} />
      </span>
    </button>
  )
}

// Desktop: a top bar with the links in a pill. Phones: a slim top bar and a floating dock.
export default function Nav({ page, onNavigate, badges, timer, user, onSignOut, theme, onThemeChange }) {
  const link = (item, variant) => {
    const active = item.pages.includes(page)
    return (
      <a
        key={item.page}
        href={`#/${item.page}`}
        className={`${variant}__link${active ? ' is-active' : ''}`}
        aria-current={active ? 'page' : undefined}
        aria-label={item.label}
        title={item.label}
        onClick={(event) => {
          event.preventDefault()
          onNavigate(item.page)
        }}
      >
        <span className="nav-icon">
          <Icon name={item.icon} size={variant === 'dock' ? 22 : 18} />
          {badges[item.page] > 0 && <span className="nav-badge">{badges[item.page]}</span>}
        </span>
        <span className={`${variant}__label`}>{item.label}</span>
      </a>
    )
  }

  const timerPill = timer.running && (
    <button type="button" className="timer-pill" onClick={() => onNavigate('focus')}>
      <Icon name="focus" size={16} />
      {timer.mode === 'focus' ? 'Focus' : 'Break'} {formatTime(timer.remaining)}
    </button>
  )

  return (
    <>
      <header className="topnav">
        <div className="topnav__inner">
          <Brand onClick={() => onNavigate('home')} />
          <nav className="topnav__links" aria-label="Main">
            {NAV_ITEMS.map((item) => link(item, 'topnav'))}
          </nav>
          <div className="topnav__actions">
            {timerPill}
            <ThemeToggle theme={theme} onChange={onThemeChange} />
            <AccountMenu user={user} onSignOut={onSignOut} onProfile={() => onNavigate('profile')} />
          </div>
        </div>
      </header>

      <header className="mobilebar">
        <Brand onClick={() => onNavigate('home')} />
        <div className="mobilebar__right">
          {timerPill}
          <ThemeToggle theme={theme} onChange={onThemeChange} />
        </div>
      </header>

      <nav className="dock" aria-label="Main">
        {NAV_ITEMS.filter((item) => !item.desktopOnly).map((item) => link(item, 'dock'))}
      </nav>
    </>
  )
}
