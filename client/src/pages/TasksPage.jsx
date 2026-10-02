import { useEffect, useMemo, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import SubTabs from '../components/SubTabs'
import TaskForm from '../components/TaskForm'
import TaskItem from '../components/TaskItem'
import Toolbar from '../components/Toolbar'
import { PRIORITY_RANK, VIEWS, daysUntil } from '../utils'

const VIEW_TABS = [
  { page: 'tasks', label: 'List', icon: 'list' },
  { page: 'calendar', label: 'Calendar', icon: 'calendar' },
]

const inView = (view, item) => {
  if (view === 'done') return item.status
  if (view === 'all') return true
  if (item.status || !item.dueDate) return false

  const days = daysUntil(item.dueDate)
  if (view === 'today') return days <= 0
  if (view === 'upcoming') return days >= 0 && days <= 7
  if (view === 'overdue') return days < 0
  return true
}

const compareBy = {
  due: (a, b) => {
    if (a.dueDate !== b.dueDate) {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    }
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  },
  priority: (a, b) =>
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || compareBy.due(a, b),
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
}

export default function TasksPage({
  page,
  onNavigate,
  todos,
  loading,
  subjects,
  focusTaskId,
  onAdd,
  onUpdate,
  onDelete,
  onClearDone,
  onFocus,
  onBreakdown,
}) {
  const [view, setView] = useState('all')
  const [filters, setFilters] = useState({ search: '', subject: '', type: '', sort: 'due' })
  const newTaskRef = useRef(null)
  const searchRef = useRef(null)

  // Keyboard shortcuts: N = new task, / = search.
  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || event.target.isContentEditable) return
      if (event.ctrlKey || event.metaKey || event.altKey) return

      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        newTaskRef.current?.focus()
      } else if (event.key === '/') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const counts = useMemo(
    () => Object.fromEntries(VIEWS.map((v) => [v.value, todos.filter((t) => inView(v.value, t)).length])),
    [todos],
  )

  const visible = useMemo(() => {
    const search = filters.search.trim().toLowerCase()

    return todos
      .filter((t) => inView(view, t))
      .filter((t) => !filters.subject || t.subject === filters.subject)
      .filter((t) => !filters.type || t.type === filters.type)
      .filter((t) => !search || [t.todo, t.notes, t.subject].some((text) => text.toLowerCase().includes(search)))
      .sort((a, b) => Number(a.status) - Number(b.status) || compareBy[filters.sort](a, b))
  }, [todos, view, filters])

  return (
    <div className="page">
      <PageHeader title="Tasks" subtitle="Assignments, exams, readings and everything else on your plate." />
      <SubTabs items={VIEW_TABS} page={page} onNavigate={onNavigate} label="Task views" />

      <TaskForm ref={newTaskRef} onAdd={onAdd} subjects={subjects} />

      <Toolbar
        ref={searchRef}
        view={view}
        onViewChange={setView}
        counts={counts}
        filters={filters}
        onFiltersChange={setFilters}
        subjects={subjects}
      />

      {loading ? (
        <ul className="todos" aria-busy="true">
          {[0, 1, 2].map((i) => <li key={i} className="todo skeleton" />)}
        </ul>
      ) : visible.length === 0 ? (
        <div className="empty">
          <p className="empty__title">{todos.length === 0 ? 'No tasks yet' : 'Nothing here'}</p>
          <p>{todos.length === 0 ? 'Add your first assignment or exam above.' : 'Try another tab or clear your search.'}</p>
        </div>
      ) : (
        <ul className="todos">
          {visible.map((item) => (
            <TaskItem
              key={item._id}
              item={item}
              subjects={subjects}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onFocus={onFocus}
              onBreakdown={onBreakdown}
              isFocused={focusTaskId === item._id}
            />
          ))}
        </ul>
      )}

      {counts.done > 0 && (view === 'all' || view === 'done') && (
        <button type="button" className="link-btn clear-done" onClick={onClearDone}>
          Clear {counts.done} completed task{counts.done === 1 ? '' : 's'}
        </button>
      )}
    </div>
  )
}
