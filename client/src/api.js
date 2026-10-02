const OFFLINE_MESSAGE = "Can't reach the server. Check your internet connection and try again."
const SERVER_DOWN_MESSAGE = "The server isn't responding right now. Please try again in a moment."

const request = async (url, options = {}) => {
  let res
  try {
    res = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    })
  } catch {
    const error = new Error(OFFLINE_MESSAGE)
    error.status = 0
    throw error
  }
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // A 5xx without our JSON message means the server itself is down or restarting.
    const fallback = res.status >= 500 ? SERVER_DOWN_MESSAGE : `Request failed (${res.status})`
    const error = new Error(data?.mssg || fallback)
    error.status = res.status
    throw error
  }

  return data
}

// True when an error means "couldn't talk to the server" rather than "the server said no".
export const isConnectionError = (error) => error.status === 0 || error.message === SERVER_DOWN_MESSAGE

export const api = {
  list: () => request('/api/todos'),
  create: (fields) => request('/api/todos', { method: 'POST', body: JSON.stringify(fields) }),
  update: (id, fields) => request(`/api/todos/${id}`, { method: 'PUT', body: JSON.stringify(fields) }),
  remove: (id) => request(`/api/todos/${id}`, { method: 'DELETE' }),
  clearDone: () => request('/api/todos?status=done', { method: 'DELETE' }),
}

export const auth = {
  me: () => request('/api/auth/me'),
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  updateProfile: (fields) => request('/api/auth/me', { method: 'PUT', body: JSON.stringify(fields) }),
  changeEmail: (email, password) => request('/api/auth/email', { method: 'PUT', body: JSON.stringify({ email, password }) }),
  forgotPassword: (email) => request('/api/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, password) => request('/api/auth/reset', { method: 'POST', body: JSON.stringify({ token, password }) }),
  changePassword: (currentPassword, newPassword) =>
    request('/api/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
}

export const classesApi = {
  list: () => request('/api/classes'),
  create: (fields) => request('/api/classes', { method: 'POST', body: JSON.stringify(fields) }),
  update: (id, fields) => request(`/api/classes/${id}`, { method: 'PUT', body: JSON.stringify(fields) }),
  remove: (id) => request(`/api/classes/${id}`, { method: 'DELETE' }),
}

// Reads the server-sent events from /api/ai/chat and calls onText for each piece of the answer.
const streamChat = async (messages, today, { onText, signal }) => {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, today }),
    signal,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    const error = new Error(data?.mssg || `Request failed (${res.status})`)
    error.status = res.status
    throw error
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result = { done: false }

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let boundary
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const line = buffer.slice(0, boundary).trim()
      buffer = buffer.slice(boundary + 2)
      if (!line.startsWith('data:')) continue

      const event = JSON.parse(line.slice(5))
      if (event.text) onText(event.text)
      if (event.error) throw new Error(event.error)
      if (event.done) result = event
    }
  }

  if (!result.done) throw new Error('The answer was cut off. Please try again.')
  return result
}

export const aiApi = {
  status: () => request('/api/ai/status'),
  breakdown: (taskId, today) => request('/api/ai/breakdown', { method: 'POST', body: JSON.stringify({ taskId, today }) }),
  chat: streamChat,
}
