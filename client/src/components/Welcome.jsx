import { useEffect, useState } from 'react'
import Icon from './Icon'

const slides = (firstName) => [
  {
    image: '/bird-480.png',
    title: `Welcome, ${firstName}!`,
    text: "Awesome ToDo's is your planner for classes, deadlines and grades. Here's a quick tour.",
  },
  {
    icon: 'classes',
    title: 'Add your classes',
    text: 'Build your weekly timetable. Class names become task subjects, with matching colors everywhere.',
  },
  {
    icon: 'tasks',
    title: 'Never miss a deadline',
    text: 'Add assignments, exams and readings with due dates. Home and Calendar show what is due next.',
  },
  {
    icon: 'grades',
    title: 'Know where you stand',
    text: 'Log your scores to see your average and exactly what you need on the next exam.',
  },
  {
    image: '/bird-480.png',
    title: 'Meet Study Buddy',
    text: 'Tap the bird in the corner anytime to plan your week, get quizzed, or break down a big assignment.',
  },
]

export default function Welcome({ user, onFinish }) {
  const [index, setIndex] = useState(0)
  const all = slides(user.name.split(' ')[0])
  const slide = all[index]
  const last = index === all.length - 1

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(all.length - 1, i + 1))
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
      if (event.key === 'Escape') onFinish('home')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [all.length, onFinish])

  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-label="Welcome tour">
      <div className="welcome__card">
        <button type="button" className="welcome__skip" onClick={() => onFinish('home')}>Skip</button>

        <div className="welcome__slide" key={index}>
          {slide.image ? (
            <img className="welcome__mascot" src={slide.image} alt="" width="200" height="200" />
          ) : (
            <span className="welcome__icon"><Icon name={slide.icon} size={44} /></span>
          )}
          <h2>{slide.title}</h2>
          <p>{slide.text}</p>
        </div>

        <div className="welcome__dots" role="tablist" aria-label="Tour steps">
          {all.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Step ${i + 1}`}
              className={i === index ? 'is-active' : ''}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>

        <div className="welcome__actions">
          {index > 0 && !last && (
            <button type="button" className="btn btn--ghost" onClick={() => setIndex(index - 1)}>Back</button>
          )}
          {last ? (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => onFinish('home')}>Go to my planner</button>
              <button type="button" className="btn btn--primary" onClick={() => onFinish('classes')}>
                <Icon name="plus" size={16} /> Add my classes
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--primary" onClick={() => setIndex(index + 1)}>
              {index === 0 ? "Let's go" : 'Next'} <Icon name="right" size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
