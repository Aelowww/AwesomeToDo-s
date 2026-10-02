import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { aiApi, api, classesApi, isConnectionError } from './api'
import ChatWidget from './components/ChatWidget'
import CompletionCard from './components/CompletionCard'
import ConfirmDialog from './components/ConfirmDialog'
import Confetti from './components/Confetti'
import LoadingScreen from './components/LoadingScreen'
import Nav from './components/Nav'
import Toast from './components/Toast'
import Welcome from './components/Welcome'
import CalendarPage from './pages/CalendarPage'
import ClassesPage from './pages/ClassesPage'
import FocusPage from './pages/FocusPage'
import GradesPage from './pages/GradesPage'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import TasksPage from './pages/TasksPage'
import { ConfirmContext } from './confirm'
import { SubjectColorContext } from './subjectColors'
import { applyTheme, getThemePreference } from './theme'
import useHashRoute from './useHashRoute'
import useStudyChat from './useStudyChat'
import { CLASS_COLORS, daysUntil, loadJSON, newId, saveJSON, todayISO } from './utils'

const PAGES = ['home', 'tasks', 'calendar', 'classes', 'grades', 'focus', 'profile']
// Old links to the Study Buddy page (and the app shortcut) open the chat instead.
const startsWithChatOpen = () =>
  window.location.hash === '#/assistant' || new URLSearchParams(window.location.search).has('chat')
const FOCUS_LOG_KEY = 'awesome-todos:focus-log'

// The fields needed to re-create a deleted task (for Undo).
const restorable = (t) => ({
  todo: t.todo,
  status: t.status,
  subject: t.subject,
  type: t.type,
  priority: t.priority,
  dueDate: t.dueDate,
  notes: t.notes,
  subtasks: t.subtasks,
  pomodoros: t.pomodoros,
})

export default function Planner({ user, isNewUser, onSignOut, onSessionExpired, onUserChange }) {
  const focusLogKey = `${FOCUS_LOG_KEY}:${user.id}`
  const [page, navigate] = useHashRoute(PAGES, 'home')
  const [todos, setTodos] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [showWelcome, setShowWelcome] = useState(isNewUser)
  const [celebration, setCelebration] = useState(0)
  const [themePreference, setThemePreference] = useState(getThemePreference)
  const [confirmState, setConfirmState] = useState(null)
  const [completion, setCompletion] = useState(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [chatOpen, setChatOpen] = useState(startsWithChatOpen)
  const [chatUnread, setChatUnread] = useState(false)
  const chatOpenRef = useRef(chatOpen)
  const [focusTaskId, setFocusTaskId] = useState(null)
  const [focusLog, setFocusLog] = useState(() => loadJSON(focusLogKey, {}))
  const [timer, setTimer] = useState({ running: false, remaining: 0, mode: 'focus' })
  const chat = useStudyChat(onSessionExpired)
  const todosRef = useRef(todos)

  useEffect(() => {
    todosRef.current = todos
  }, [todos])

  useEffect(() => {
    chatOpenRef.current = chatOpen
  }, [chatOpen])

  useEffect(() => {
    let mounted = true

    Promise.all([
      api.list(),
      classesApi.list(),
      aiApi.status().catch(() => ({ enabled: false })),
    ])
      .then(([todoData, classData, ai]) => {
        if (!mounted) return
        setTodos(todoData)
        setClasses(classData)
        setAiEnabled(ai.enabled)
      })
      .catch((err) => {
        if (!mounted) return
        if (err.status === 401) onSessionExpired()
        else if (isConnectionError(err)) setLoadError(err.message)
        else setError(err.message)
      })
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [onSessionExpired, loadAttempt])

  const retryLoad = () => {
    setLoadError('')
    setLoading(true)
    setLoadAttempt((n) => n + 1)
  }

  const showToast = (message, options = {}) => setToast({ message, ...options, id: Date.now() })
  const closeToast = useCallback(() => setToast(null), [])
  const closeCompletion = useCallback(() => setCompletion(null), [])

  // Shows the confirmation dialog and resolves to the student's answer.
  const confirm = useCallback((options) => new Promise((resolve) => setConfirmState({ ...options, resolve })), [])
  const resolveConfirm = useCallback((answer) => {
    setConfirmState((current) => {
      current?.resolve(answer)
      return null
    })
  }, [])

  // Runs an API call, showing any error in the banner. Resolves to true on success.
  const run = async (action) => {
    try {
      setError('')
      await action()
      return true
    } catch (err) {
      if (err.status === 401) onSessionExpired()
      else setError(err.message)
      return false
    }
  }

  const replaceTodo = (updated) =>
    setTodos((current) => current.map((t) => (t._id === updated._id ? updated : t)))

  const addTodo = (fields) => run(async () => {
    const created = await api.create(fields)
    setTodos((current) => [...current, created])
  })

  // Saves changes to a task: updates the screen right away, then syncs with what the server saved.
  const saveTodo = (id, fields) => {
    const previous = todosRef.current.find((t) => t._id === id)
    if (!previous) return Promise.resolve(false)
    replaceTodo({ ...previous, ...fields })

    return run(async () => {
      try {
        replaceTodo(await api.update(id, fields))
      } catch (err) {
        replaceTodo(previous)
        throw err
      }
    })
  }

  // Like saveTodo, but asks before completing or reopening a task, and celebrates completions.
  const updateTodo = async (id, fields) => {
    const previous = todosRef.current.find((t) => t._id === id)
    if (!previous) return false
    const statusChange = fields.status !== undefined && fields.status !== previous.status

    if (statusChange) {
      const ok = await confirm(fields.status
        ? {
            title: 'Mark as complete?',
            message: `"${previous.todo}" will move to your completed tasks.`,
            confirmLabel: 'Yes, complete it',
            image: '/bird-480.png',
          }
        : {
            title: 'Mark as not done?',
            message: `"${previous.todo}" will go back to your open tasks.`,
            confirmLabel: 'Mark as not done',
          })
      if (!ok) return false
    }

    const saved = await saveTodo(id, fields)
    if (saved && statusChange && fields.status) {
      setCelebration(Date.now())
      setCompletion({ id: Date.now(), task: previous })
    }
    return saved
  }

  const deleteTodo = async (id) => {
    const removed = todosRef.current.find((t) => t._id === id)
    const ok = await confirm({
      title: 'Delete this task?',
      message: `"${removed.todo}" will be deleted, including its steps and notes.`,
      confirmLabel: 'Delete task',
      tone: 'danger',
    })
    if (!ok) return false
    return run(async () => {
      await api.remove(id)
      setTodos((current) => current.filter((t) => t._id !== id))
      if (focusTaskId === id) setFocusTaskId(null)
      showToast('Task deleted', { action: { label: 'Undo', onClick: () => addTodo(restorable(removed)) } })
    })
  }

  const clearDone = async () => {
    const count = todos.filter((t) => t.status).length
    if (!count) return
    const ok = await confirm({
      title: `Clear ${count} completed task${count === 1 ? '' : 's'}?`,
      message: 'They will be deleted for good. This cannot be undone.',
      confirmLabel: 'Clear them',
      tone: 'danger',
    })
    if (!ok) return

    run(async () => {
      await api.clearDone()
      setTodos((current) => current.filter((t) => !t.status))
      showToast(`Cleared ${count} completed task${count === 1 ? '' : 's'}`)
    })
  }

  const breakdownTask = async (item) => {
    try {
      const { steps } = await aiApi.breakdown(item._id, todayISO())
      if (steps.length === 0) {
        showToast('The AI had no new steps to add.')
        return
      }
      const current = todosRef.current.find((t) => t._id === item._id) ?? item
      const subtasks = [...current.subtasks, ...steps.map((text) => ({ id: newId(), text, done: false }))]
      if (await saveTodo(item._id, { subtasks })) {
        showToast(`Added ${steps.length} steps ✨`)
      }
    } catch (err) {
      if (err.status === 401) onSessionExpired()
      else showToast(err.message, { tone: 'error' })
    }
  }

  const createClass = (fields) => run(async () => {
    const created = await classesApi.create(fields)
    setClasses((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
    showToast(`${created.name} added`)
  })

  const updateClass = (id, fields) => run(async () => {
    const updated = await classesApi.update(id, fields)
    setClasses((current) => current.map((c) => (c._id === id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name)))
  })

  const deleteClass = async (id) => {
    const cls = classes.find((c) => c._id === id)
    const ok = await confirm({
      title: `Delete ${cls?.name ?? 'this class'}?`,
      message: 'Its schedule and all of its grades will be deleted. Your tasks stay.',
      confirmLabel: 'Delete class',
      tone: 'danger',
    })
    if (!ok) return false
    return run(async () => {
      await classesApi.remove(id)
      setClasses((current) => current.filter((c) => c._id !== id))
    })
  }

  const signOut = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: 'You can sign back in anytime with your email and password.',
      confirmLabel: 'Sign out',
    })
    if (ok) onSignOut()
  }

  const handleFocusComplete = (taskId) => {
    const today = todayISO()
    const nextLog = { ...focusLog, [today]: (focusLog[today] || 0) + 1 }
    setFocusLog(nextLog)
    saveJSON(focusLogKey, nextLog)

    const task = todosRef.current.find((t) => t._id === taskId)
    if (task) saveTodo(task._id, { pomodoros: task.pomodoros + 1 })
  }

  const focusOn = (taskId) => {
    setFocusTaskId(taskId)
    if (taskId) navigate('focus')
  }

  // Sends a chat message; if the chat is closed when the answer finishes, show a dot on the bubble.
  const sendChat = async (text) => {
    const ok = await chat.send(text)
    if (!chatOpenRef.current) setChatUnread(true)
    return ok
  }

  const setChatVisible = useCallback((visible) => {
    setChatOpen(visible)
    if (visible) setChatUnread(false)
  }, [])

  const subjects = useMemo(
    () => [...new Set([...classes.map((c) => c.name), ...todos.map((t) => t.subject)].filter(Boolean))]
      .sort((a, b) => a.localeCompare(b)),
    [todos, classes],
  )

  const classColors = useMemo(
    () => Object.fromEntries(classes.map((c) => [c.name.toLowerCase(), CLASS_COLORS[c.color]])),
    [classes],
  )

  const changeTheme = (preference) => {
    setThemePreference(preference)
    applyTheme(preference)
  }

  const finishWelcome = (target) => {
    setShowWelcome(false)
    navigate(target)
  }

  if (loadError) return <LoadingScreen error={loadError} onRetry={retryLoad} />
  if (loading) return <LoadingScreen />

  const openTasks = todos.filter((t) => !t.status)
  const badges = {
    tasks: openTasks.filter((t) => t.dueDate && daysUntil(t.dueDate) <= 0).length,
  }

  return (
    <ConfirmContext.Provider value={confirm}>
    <SubjectColorContext.Provider value={classColors}>
      <div className="app">
        <a className="skip-link" href="#main">Skip to content</a>
        <Nav
          page={page}
          onNavigate={navigate}
          badges={badges}
          timer={timer}
          user={user}
          onSignOut={signOut}
          theme={document.documentElement.dataset.theme}
          onThemeChange={changeTheme}
        />

        <main className="main" id="main" tabIndex={-1}>
          {error && (
            <div className="banner" role="alert">
              {error}
              <button type="button" onClick={() => setError('')} aria-label="Dismiss error">{'×'}</button>
            </div>
          )}

          {page === 'home' && (
            <HomePage
              user={user}
              todos={todos}
              classes={classes}
              focusLog={focusLog}
              subjects={subjects}
              onAdd={addTodo}
              onNavigate={navigate}
            />
          )}
          {page === 'tasks' && (
            <TasksPage
              page={page}
              onNavigate={navigate}
              todos={todos}
              loading={loading}
              subjects={subjects}
              focusTaskId={focusTaskId}
              onAdd={addTodo}
              onUpdate={updateTodo}
              onDelete={deleteTodo}
              onClearDone={clearDone}
              onFocus={focusOn}
              onBreakdown={aiEnabled ? breakdownTask : null}
            />
          )}
          {page === 'calendar' && (
            <CalendarPage page={page} onNavigate={navigate} todos={todos} subjects={subjects} onAdd={addTodo} onUpdate={updateTodo} />
          )}
          {page === 'classes' && (
            <ClassesPage page={page} onNavigate={navigate} classes={classes} onCreate={createClass} onUpdate={updateClass} onDelete={deleteClass} />
          )}
          {page === 'profile' && (
            <ProfilePage
              user={user}
              onUserChange={onUserChange}
              onSignOut={signOut}
              theme={themePreference}
              onThemeChange={changeTheme}
            />
          )}
          {page === 'grades' && <GradesPage page={page} classes={classes} onUpdate={updateClass} onNavigate={navigate} />}

          {/* The timer stays mounted on every page so it keeps running in the background. */}
          <div hidden={page !== 'focus'}>
            <FocusPage
              tasks={openTasks}
              taskId={focusTaskId}
              onTaskChange={setFocusTaskId}
              onFocusComplete={handleFocusComplete}
              onStatus={setTimer}
              focusLog={focusLog}
            />
          </div>
        </main>

        <ChatWidget
          open={chatOpen}
          onOpenChange={setChatVisible}
          unread={chatUnread}
          aiEnabled={aiEnabled}
          chat={{ ...chat, send: sendChat }}
        />

        {toast && <Toast key={toast.id} toast={toast} onClose={closeToast} />}
        {celebration > 0 && <Confetti key={celebration} seed={celebration} />}
        {completion && (
          <CompletionCard
            key={completion.id}
            completion={completion}
            firstName={user.name.split(' ')[0]}
            onUndo={() => saveTodo(completion.task._id, { status: false })}
            onClose={closeCompletion}
          />
        )}
        {showWelcome && <Welcome user={user} onFinish={finishWelcome} />}
        {confirmState && <ConfirmDialog {...confirmState} onResolve={resolveConfirm} />}
      </div>
    </SubjectColorContext.Provider>
    </ConfirmContext.Provider>
  )
}
