import ActivityChart from '../components/ActivityChart'
import Icon from '../components/Icon'
import ProgressRing from '../components/ProgressRing'
import { DeadlineCards, StatTiles } from '../components/Stats'
import TaskForm from '../components/TaskForm'
import WeekStrip from '../components/WeekStrip'
import {
  CLASS_COLORS,
  daysUntil,
  durationLabel,
  minutesOf,
  sessionsOn,
  studyStreak,
  timeLabel,
  toISODate,
  todayISO,
} from '../utils'

const greeting = () => {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

function EmptyBird({ title, text, children }) {
  return (
    <div className="empty-bird">
      <img src="/bird-128.png" alt="" width="64" height="64" />
      <div>
        <strong>{title}</strong>
        {text && <p className="muted">{text}</p>}
        {children}
      </div>
    </div>
  )
}

function ClassTimeline({ sessions, nowMinutes }) {
  const nextIndex = sessions.findIndex((s) => minutesOf(s.start) > nowMinutes)
  return (
    <ol className="timeline">
      {sessions.map((s, index) => {
        const start = minutesOf(s.start)
        const end = minutesOf(s.end)
        const live = start <= nowMinutes && nowMinutes < end
        const done = end <= nowMinutes
        const elapsed = live ? (nowMinutes - start) / (end - start) : 0
        return (
          <li
            key={`${s.cls._id}-${s.start}`}
            className={`timeline__item${live ? ' is-live' : ''}${done ? ' is-done' : ''}`}
            style={{ '--class-color': CLASS_COLORS[s.cls.color] }}
          >
            <span className="timeline__time">
              <strong>{timeLabel(s.start)}</strong>
              <small>{timeLabel(s.end)}</small>
            </span>
            <span className="timeline__node" aria-hidden="true">
              {done ? <Icon name="checkCircle" size={14} /> : null}
            </span>
            <div className="timeline__card">
              <div className="timeline__top">
                <strong>{s.cls.name}</strong>
                {live && <span className="badge badge--live">Now</span>}
                {!live && index === nextIndex && <span className="badge">In {durationLabel(start - nowMinutes)}</span>}
              </div>
              <div className="timeline__meta">
                {s.cls.room && <span><Icon name="pin" size={13} /> {s.cls.room}</span>}
                <span><Icon name="clock" size={13} /> {durationLabel(end - start)}</span>
              </div>
              {live && (
                <div className="meter" role="progressbar" aria-label="Class progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(elapsed * 100)}>
                  <span style={{ width: `${elapsed * 100}%` }} />
                  <small>{durationLabel(end - nowMinutes)} left</small>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default function HomePage({ user, todos, classes, focusLog, subjects, onAdd, onNavigate }) {
  const today = todayISO()
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const todaySessions = sessionsOn(classes, now.getDay())

  const open = todos.filter((t) => !t.status)

  // Today's ring: tasks finished today out of everything that needed doing today.
  const doneToday = todos.filter((t) => t.status).filter((t) => t.completedAt && toISODate(new Date(t.completedAt)) === today).length
  const leftToday = open.filter((t) => t.dueDate && daysUntil(t.dueDate) <= 0).length
  const todayTotal = doneToday + leftToday
  const streak = studyStreak(todos, focusLog)

  return (
    <div className="page home">
      <section className="hero-card hero-card--home">
        <div className="hero-card__main">
          <p className="hero-card__date">
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="hero-card__title">{greeting()}, {user.name.split(' ')[0]}</h1>
          <div className="hero-chips">
            <span className="hero-chip"><Icon name="tasks" size={14} /> {open.length} open</span>
            <span className="hero-chip"><Icon name="classes" size={14} /> {todaySessions.length} class{todaySessions.length === 1 ? '' : 'es'}</span>
            {streak > 0 && <span className="hero-chip hero-chip--warm"><Icon name="flame" size={14} /> {streak}-day streak</span>}
          </div>
        </div>
        <ProgressRing
          value={todayTotal ? doneToday / todayTotal : 1}
          label={todayTotal ? `${doneToday} of ${todayTotal} tasks for today done` : 'Nothing left for today'}
        >
          {todayTotal ? (
            <>
              <strong className="ring__value">{doneToday}/{todayTotal}</strong>
              <small>today</small>
            </>
          ) : (
            <>
              <Icon name="checkCircle" size={26} />
              <small>All clear</small>
            </>
          )}
        </ProgressRing>
        <img className="hero-card__bird" src="/bird-128.png" alt="" width="72" height="72" aria-hidden="true" />
        <div className="hero-card__add">
          <TaskForm onAdd={onAdd} subjects={subjects} compact />
        </div>
      </section>

      <StatTiles todos={todos} focusLog={focusLog} />

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">This week</h2>
          <button type="button" className="link-btn" onClick={() => onNavigate('calendar')}>Calendar</button>
        </div>
        <WeekStrip todos={todos} onOpenCalendar={() => onNavigate('calendar')} />
      </section>

      <div className="dash-grid">
        <div className="dash-col">
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Today's classes</h2>
              <button type="button" className="link-btn" onClick={() => onNavigate('classes')}>Schedule</button>
            </div>
            {classes.length === 0 ? (
              <EmptyBird title="No classes yet" text="Add them to see your day at a glance.">
                <button type="button" className="btn btn--primary" onClick={() => onNavigate('classes')}>
                  <Icon name="plus" size={16} /> Add classes
                </button>
              </EmptyBird>
            ) : todaySessions.length === 0 ? (
              <EmptyBird title="No classes today" text="A good day to get ahead!" />
            ) : (
              <ClassTimeline sessions={todaySessions} nowMinutes={nowMinutes} />
            )}
          </section>

          <section className="panel focus-card">
            <span className="focus-card__icon" aria-hidden="true"><Icon name="focus" size={22} /></span>
            <div className="focus-card__text">
              <h2 className="panel__title">Focus timer</h2>
              <p className="muted">
                {focusLog[today] ? `${focusLog[today]} session${focusLog[today] === 1 ? '' : 's'} today. Keep going!` : '25 minutes of deep work, then a break.'}
              </p>
            </div>
            <button type="button" className="btn btn--primary" onClick={() => onNavigate('focus')}>Start</button>
          </section>
        </div>

        <div className="dash-col">
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Last 7 days</h2>
            </div>
            <ActivityChart todos={todos} />
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Upcoming deadlines</h2>
            </div>
            <DeadlineCards todos={todos} onOpen={() => onNavigate('tasks')} />
          </section>


        </div>
      </div>
    </div>
  )
}
