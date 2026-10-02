export const TYPES = [
  { value: 'task', label: 'Task', icon: '\u{1F4DD}' },
  { value: 'assignment', label: 'Assignment', icon: '\u{1F4DA}' },
  { value: 'exam', label: 'Exam / Quiz', icon: '\u{1F3AF}' },
  { value: 'project', label: 'Project', icon: '\u{1F6E0}\u{FE0F}' },
  { value: 'reading', label: 'Reading', icon: '\u{1F4D6}' },
]

export const VIEWS = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Next 7 days' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'done', label: 'Done' },
]

export const PRIORITIES =['low', 'medium', 'high']
export const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

export const typeInfo = (value) => TYPES.find((t) => t.value === value) ?? TYPES[0]

// Dates are stored as local "YYYY-MM-DD" strings so a deadline never shifts with time zones.
export const toISODate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const fromISODate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = () => toISODate(new Date())

export const addDays = (iso, days) => {
  const date = fromISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export const daysUntil = (iso) => {
  const ms = fromISODate(iso) - fromISODate(todayISO())
  return Math.round(ms / 86_400_000)
}

export const dueLabel = (iso) => {
  const days = daysUntil(iso)
  if (days < -1) return `Overdue by ${-days} days`
  if (days === -1) return 'Overdue since yesterday'
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'

  const date = fromISODate(iso)
  if (days < 7) return `Due ${date.toLocaleDateString(undefined, { weekday: 'long' })}`
  return `Due ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

export const dueTone = (iso, done) => {
  if (done || !iso) return ''
  const days = daysUntil(iso)
  if (days < 0) return 'overdue'
  if (days <= 1) return 'soon'
  return ''
}

// Give each subject a stable color derived from its name.
export const subjectColor = (name) => {
  let hash = 0
  for (const char of name.toLowerCase()) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360
  }
  return `hsl(${hash}, 70%, 65%)`
}

export const loadJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export const saveJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable (private mode); the app still works without it.
  }
}

export const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const CLASS_COLORS = {
  violet: '#b18cff',
  blue: '#6aa8ff',
  teal: '#3fd6c5',
  green: '#5ee2a0',
  amber: '#ffc861',
  orange: '#ff9d5c',
  rose: '#ff7a93',
  pink: '#f58ad8',
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// School weeks read better starting on Monday.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export const timeLabel = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export const minutesOf = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const durationLabel = (minutes) => {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

// Every class meeting on a given weekday, sorted by start time.
export const sessionsOn = (classes, day) =>
  classes
    .flatMap((c) => c.meetings.filter((m) => m.day === day).map((m) => ({ ...m, cls: c })))
    .sort((a, b) => a.start.localeCompare(b.start))

// Weighted average in percent. Falls back to a plain average when no weights are set.
export const classAverage = (assessments) => {
  if (assessments.length === 0) return null
  const totalWeight = assessments.reduce((sum, a) => sum + a.weight, 0)
  if (totalWeight === 0) {
    return assessments.reduce((sum, a) => sum + (a.score / a.max) * 100, 0) / assessments.length
  }
  return assessments.reduce((sum, a) => sum + (a.score / a.max) * a.weight, 0) / totalWeight * 100
}

// The average score needed on the remaining weight to finish with the target grade.
export const neededForTarget = (assessments, target) => {
  const usedWeight = assessments.reduce((sum, a) => sum + a.weight, 0)
  const remaining = 100 - usedWeight
  if (target === null || remaining <= 0) return null
  const earned = assessments.reduce((sum, a) => sum + (a.score / a.max) * a.weight, 0)
  return { needed: ((target - earned) / remaining) * 100, remaining }
}

export const gradeTone = (percent) => {
  if (percent === null) return ''
  if (percent >= 90) return 'great'
  if (percent >= 75) return 'good'
  if (percent >= 60) return 'warn'
  return 'bad'
}

// Crops an image file to a centered square and shrinks it to a small JPEG data URL for a profile photo.
export const imageFileToAvatar = (file, size = 256) =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file (JPG, PNG or WebP).'))
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      reject(new Error('That image is too large. Please choose one under 15 MB.'))
      return
    }

    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const side = Math.min(image.naturalWidth, image.naturalHeight)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, size, size)
      URL.revokeObjectURL(url)

      let quality = 0.85
      let data = canvas.toDataURL('image/jpeg', quality)
      while (data.length > 85_000 && quality > 0.4) {
        quality -= 0.15
        data = canvas.toDataURL('image/jpeg', quality)
      }
      resolve(data)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("That image couldn't be opened. Try a JPG or PNG."))
    }
    image.src = url
  })

// 0-4 score with a label, for the password strength meter.
export const passwordStrength = (password) => {
  if (!password) return { score: 0, label: '' }
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1
  if (password.length < 8) score = 0
  return { score, label: ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score] }
}

// Consecutive days (ending today, or yesterday if today has nothing yet) with a finished task or focus session.
export const studyStreak = (todos, focusLog) => {
  const activeDays = new Set(Object.keys(focusLog).filter((day) => focusLog[day] > 0))
  todos.forEach((t) => t.completedAt && activeDays.add(toISODate(new Date(t.completedAt))))

  let day = todayISO()
  if (!activeDays.has(day)) day = addDays(day, -1)
  let streak = 0
  while (activeDays.has(day)) {
    streak += 1
    day = addDays(day, -1)
  }
  return streak
}
