import { forwardRef } from 'react'
import { TYPES, VIEWS } from '../utils'

const Toolbar = forwardRef(function Toolbar(
  { view, onViewChange, counts, filters, onFiltersChange, subjects },
  searchRef,
) {
  const set = (key) => (event) => onFiltersChange({ ...filters, [key]: event.target.value })

  return (
    <section className="toolbar" aria-label="Filter tasks">
      <div className="tabs" role="tablist">
        {VIEWS.map((v) => (
          <button
            key={v.value}
            type="button"
            role="tab"
            aria-selected={view === v.value}
            className={`tab${view === v.value ? ' tab--active' : ''}${v.value === 'overdue' && counts.overdue ? ' tab--alert' : ''}`}
            onClick={() => onViewChange(v.value)}
          >
            {v.label}
            <span className="tab__count">{counts[v.value]}</span>
          </button>
        ))}
      </div>

      <div className="filters">
        <input
          ref={searchRef}
          type="search"
          className="filters__search"
          value={filters.search}
          onChange={set('search')}
          placeholder="Search tasks, notes, subjects...  ( / )"
          aria-label="Search tasks"
        />
        <select value={filters.subject} onChange={set('subject')} aria-label="Filter by subject">
          <option value="">All subjects</option>
          {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
        </select>
        <select value={filters.type} onChange={set('type')} aria-label="Filter by type">
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </select>
        <select value={filters.sort} onChange={set('sort')} aria-label="Sort tasks">
          <option value="due">Sort: Due date</option>
          <option value="priority">Sort: Priority</option>
          <option value="newest">Sort: Newest</option>
        </select>
      </div>
    </section>
  )
})

export default Toolbar
