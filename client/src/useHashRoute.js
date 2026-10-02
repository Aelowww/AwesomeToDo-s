import { useEffect, useState } from 'react'

const readHash = (pages, fallback) => {
  const page = window.location.hash.replace(/^#\/?/, '')
  return pages.includes(page) ? page : fallback
}

// Keeps the current page in the URL (#/tasks) so refresh and the back button work.
export default function useHashRoute(pages, fallback) {
  const [page, setPage] = useState(() => readHash(pages, fallback))

  useEffect(() => {
    const onChange = () => setPage(readHash(pages, fallback))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [pages, fallback])

  const navigate = (next) => {
    if (next !== page) window.location.hash = `/${next}`
    window.scrollTo({ top: 0 })
  }

  return [page, navigate]
}
