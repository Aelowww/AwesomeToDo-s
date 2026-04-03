import { useEffect, useState } from 'react'

const toDisplayTodo = (value) => {
  if (typeof value !== 'string') {
    return String(value ?? '')
  }

  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'string' ? parsed : String(parsed)
  } catch {
    return value
  }
}

export default function App() {
  const [todo, setTodo] = useState('')
  const [todos, setTodos] = useState([])

  const getTodos = async () => {
    const res = await fetch('/api/todos')
    const data = await res.json()
    setTodos(data)
  }

  useEffect(() => {
    let mounted = true

    const loadTodos = async () => {
      const res = await fetch('/api/todos')
      const data = await res.json()

      if (mounted) {
        setTodos(data)
      }
    }

    loadTodos()

    return () => {
      mounted = false
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!todo.trim()) {
      return
    }

    await fetch('/api/todos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ todo: todo.trim() }),
    })

    setTodo('')
    getTodos()
  }

  const toggleTodo = async (_id, status) => {
    await fetch(`/api/todos/${_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    })

    getTodos()
  }

  const deleteTodo = async (_id) => {
    await fetch(`/api/todos/${_id}`, {
      method: 'DELETE',
    })

    getTodos()
  }

  return (
    <main className="container">
      <h1 className="title">Awesome ToDo's</h1>

      <form className="form" onSubmit={handleSubmit}>
        <input
          className="form__input"
          type="text"
          value={todo}
          onChange={(event) => setTodo(event.target.value)}
          placeholder="Enter a new To Do..."
        />
        <button className="form__button" type="submit">Create To Do</button>
      </form>

      <ul className="todos">
        {todos.map((item) => (
          <li key={item._id} className="todo">
            <span>{toDisplayTodo(item.todo)}</span>

            <div className="mutations">
              <input
                className="todo__status"
                type="checkbox"
                checked={Boolean(item.status)}
                onChange={() => toggleTodo(item._id, item.status)}
                aria-label="Toggle todo status"
              />
              <button
                className="todo__delete"
                type="button"
                onClick={() => deleteTodo(item._id)}
                aria-label="Delete todo"
              >{"\u{1F5D1}"}</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}


