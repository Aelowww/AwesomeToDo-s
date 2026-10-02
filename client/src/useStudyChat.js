import { useRef, useState } from 'react'
import { aiApi } from './api'
import { todayISO } from './utils'

// Conversation state for Study Buddy. Lives in the planner so it survives page switches.
export default function useStudyChat(onSessionExpired) {
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const controllerRef = useRef(null)

  // Resolves to true once the question was answered (even partly), false if it failed outright.
  const send = async (text) => {
    const content = text.trim()
    if (!content || streaming) return false

    const history = [...messages, { role: 'user', content }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setStreaming(true)
    setError('')

    const controller = new AbortController()
    controllerRef.current = controller
    let answer = ''

    try {
      await aiApi.chat(history, todayISO(), {
        signal: controller.signal,
        onText: (piece) => {
          answer += piece
          setMessages([...history, { role: 'assistant', content: answer }])
        },
      })
      return true
    } catch (err) {
      if (err.status === 401) onSessionExpired()
      if (err.name !== 'AbortError') setError(err.message)
      // Keep a partial answer; drop the question entirely if nothing came back.
      setMessages(answer ? [...history, { role: 'assistant', content: answer }] : messages)
      return Boolean(answer)
    } finally {
      setStreaming(false)
      controllerRef.current = null
    }
  }

  const stop = () => controllerRef.current?.abort()

  const reset = () => {
    stop()
    setMessages([])
    setError('')
  }

  return { messages, streaming, error, send, stop, reset, clearError: () => setError('') }
}
