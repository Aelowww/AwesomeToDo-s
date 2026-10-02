import { loadJSON, saveJSON } from './utils'

const THEME_KEY = 'awesome-todos:theme'
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

// 'light' (the default, matching the logo), 'dark', or 'system'.
export const getThemePreference = () => loadJSON(THEME_KEY, 'light')

const resolve = (preference) =>
  preference === 'system' ? (darkQuery().matches ? 'dark' : 'light') : preference

const paint = (preference) => {
  const theme = resolve(preference)
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1631' : '#d6e4fa')
}

let unwatch = null

export const applyTheme = (preference) => {
  saveJSON(THEME_KEY, preference)
  paint(preference)
  unwatch?.()
  unwatch = null
  if (preference === 'system') {
    const query = darkQuery()
    const onChange = () => paint('system')
    query.addEventListener('change', onChange)
    unwatch = () => query.removeEventListener('change', onChange)
  }
}
