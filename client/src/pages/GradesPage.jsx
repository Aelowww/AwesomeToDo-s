import { useState } from 'react'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import SubTabs from '../components/SubTabs'
import { useConfirm } from '../confirm'
import { CLASS_COLORS, classAverage, gradeTone, newId, neededForTarget } from '../utils'

const VIEW_TABS = [
  { page: 'classes', label: 'Schedule', icon: 'classes' },
  { page: 'grades', label: 'Grades', icon: 'grades' },
]

const formatPercent = (value) => `${Math.round(value * 10) / 10}%`

function AddGradeForm({ onAdd }) {
  const [form, setForm] = useState({ name: '', score: '', max: '100', weight: '' })
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  const submit = async (event) => {
    event.preventDefault()
    const ok = await onAdd({
      id: newId(),
      name: form.name.trim(),
      score: Number(form.score),
      max: Number(form.max),
      weight: Number(form.weight || 0),
    })
    if (ok) setForm({ ...form, name: '', score: '' })
  }

  return (
    <form className="grade-form" onSubmit={submit}>
      <input value={form.name} onChange={set('name')} placeholder="Quiz 1, Midterm..." aria-label="Assessment name" maxLength={80} required />
      <input type="number" value={form.score} onChange={set('score')} placeholder="Score" aria-label="Score" min="0" step="any" required />
      <span className="muted">/</span>
      <input type="number" value={form.max} onChange={set('max')} placeholder="Out of" aria-label="Out of" min="0.01" step="any" required />
      <input type="number" value={form.weight} onChange={set('weight')} placeholder="Weight %" aria-label="Weight percent" min="0" max="100" step="any" />
      <button type="submit" className="btn btn--primary">Add</button>
    </form>
  )
}

function ClassGrades({ cls, onUpdate }) {
  const confirm = useConfirm()
  const average = classAverage(cls.assessments)
  const usedWeight = cls.assessments.reduce((sum, a) => sum + a.weight, 0)
  const target = neededForTarget(cls.assessments, cls.targetGrade)
  const [targetInput, setTargetInput] = useState(cls.targetGrade ?? '')

  const saveTarget = () => {
    const value = targetInput === '' ? null : Number(targetInput)
    if (value !== cls.targetGrade) onUpdate(cls._id, { targetGrade: value })
  }

  return (
    <section className="panel grade-card" style={{ '--class-color': CLASS_COLORS[cls.color] }}>
      <div className="grade-card__head">
        <div>
          <h2 className="panel__title">{cls.name}</h2>
          {cls.code && <span className="muted">{cls.code}</span>}
        </div>
        <div className={`grade-big ${gradeTone(average)}`}>
          {average === null ? '--' : formatPercent(average)}
          <small>current</small>
        </div>
      </div>

      {average !== null && (
        <div className="progress" aria-hidden="true">
          <div className={`progress__bar progress__bar--${gradeTone(average)}`} style={{ width: `${Math.min(100, average)}%` }} />
        </div>
      )}

      {cls.assessments.length > 0 && (
        <table className="grade-table">
          <thead>
            <tr><th>Assessment</th><th>Score</th><th>%</th><th>Weight</th><th><span className="sr-only">Remove</span></th></tr>
          </thead>
          <tbody>
            {cls.assessments.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.score}/{a.max}</td>
                <td className={gradeTone((a.score / a.max) * 100)}>{formatPercent((a.score / a.max) * 100)}</td>
                <td>{a.weight ? `${a.weight}%` : '-'}</td>
                <td>
                  <button
                    type="button"
                    className="step__remove"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Remove ${a.name}?`,
                        message: `Your ${cls.name} average will be recalculated without it.`,
                        confirmLabel: 'Remove grade',
                        tone: 'danger',
                      })
                      if (ok) onUpdate(cls._id, { assessments: cls.assessments.filter((x) => x.id !== a.id) })
                    }}
                    aria-label={`Remove ${a.name}`}
                  >{'×'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <AddGradeForm onAdd={(a) => onUpdate(cls._id, { assessments: [...cls.assessments, a] })} />

      <div className="target">
        <label className="target__input">
          <span>Target grade</span>
          <input
            type="number"
            min="0"
            max="100"
            step="any"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            onBlur={saveTarget}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder="e.g. 90"
          />
          <span>%</span>
        </label>
        <p className="target__result">
          {cls.targetGrade === null
            ? 'Set a target to see what you need on the rest of the class.'
            : !target
              ? usedWeight >= 100
                ? `All weight is used. Your final grade is ${average === null ? '--' : formatPercent(average)}.`
                : 'Add weights (%) to your grades to use the target calculator.'
              : target.needed <= 0
                ? `You've already secured ${cls.targetGrade}%. Keep it up!`
                : target.needed > 100
                  ? `You'd need ${formatPercent(target.needed)} on the remaining ${target.remaining}%, so ${cls.targetGrade}% is out of reach. Talk to your teacher about extra credit.`
                  : <>You need an average of <strong>{formatPercent(target.needed)}</strong> on the remaining {target.remaining}% to reach {cls.targetGrade}%.</>}
        </p>
      </div>
    </section>
  )
}

export default function GradesPage({ page, classes, onUpdate, onNavigate }) {
  const averages = classes.map((c) => classAverage(c.assessments)).filter((a) => a !== null)
  const overall = averages.length ? averages.reduce((s, a) => s + a, 0) / averages.length : null

  return (
    <div className="page">
      <PageHeader title="Classes" subtitle="Track your scores and see exactly what you need to hit your goals.">
        {overall !== null && (
          <div className={`overall ${gradeTone(overall)}`}>
            <small>Overall average</small>
            <strong>{formatPercent(overall)}</strong>
          </div>
        )}
      </PageHeader>
      <SubTabs items={VIEW_TABS} page={page} onNavigate={onNavigate} label="Class views" />

      {classes.length === 0 ? (
        <div className="empty">
          <p className="empty__title">Add your classes first</p>
          <p>Grades are tracked per class.</p>
          <button type="button" className="btn btn--primary" onClick={() => onNavigate('classes')}>
            <Icon name="plus" size={16} /> Add classes
          </button>
        </div>
      ) : (
        <div className="grade-grid">
          {classes.map((c) => <ClassGrades key={c._id} cls={c} onUpdate={onUpdate} />)}
        </div>
      )}
    </div>
  )
}
