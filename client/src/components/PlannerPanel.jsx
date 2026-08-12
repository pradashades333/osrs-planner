import { useState } from 'react'

const num = (n) => Number(n).toLocaleString('en-US')
const title = (value) => value[0].toUpperCase() + value.slice(1)

function hours(value) {
  if (value == null) return 'No estimate yet'
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })} hrs`
}

export default function PlannerPanel({ rsn, apiBase }) {
  const [text, setText] = useState('70 ranged AND 80 mining AND Monkey Madness II')
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function createPlan(event) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiBase}/api/plan/${encodeURIComponent(rsn)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Could not create plan')
      setPlan(body)
    } catch (err) {
      setError(err.message)
      setPlan(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="planner-panel">
      <h2>Combined goals</h2>
      <p className="muted">Use skill targets and quest names, joined with AND.</p>
      <form className="goal-form" onSubmit={createPlan}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label="Combined goals"
        />
        <button disabled={loading || !text.trim()}>{loading ? 'Planning…' : 'Build plan'}</button>
      </form>

      {error && <p className="banner planner-error">{error}</p>}
      {plan && (
        <div className="plan-results">
          <div className="plan-summary">
            <span><strong>{num(plan.totalXp)}</strong> xp remaining</span>
            <span><strong>{hours(plan.totalHours)}</strong> total training time</span>
          </div>
          {plan.hasUnknownEstimate && (
            <p className="muted">Some goals do not have a complete training estimate yet.</p>
          )}

          {plan.skillPlans.length > 0 && (
            <section>
              <h3>Skill training</h3>
              <div className="plan-list">
                {plan.skillPlans.map((item) => (
                  <article className="plan-row" key={item.skill}>
                    <div>
                      <strong>{title(item.skill)}</strong>
                      <span className="muted">level {item.currentLevel} → {item.targetLevel}</span>
                    </div>
                    <div className="plan-row-meta">
                      <span>{num(item.xpNeeded)} xp</span>
                      <span>{hours(item.hours)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {plan.questOrder.length > 0 && (
            <section>
              <h3>Quest order</h3>
              <ol className="quest-order">
                {plan.questOrder.map((quest) => (
                  <li key={quest.slug}>
                    {quest.name}{quest.isRequested ? ' (goal)' : ''}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {plan.quests.map((quest) => (
            <section key={quest.slug}>
              <h3>{quest.name}</h3>
              {!quest.found ? <p className="muted">Not in the seeded quest catalogue yet.</p> :
                quest.completableNow ? <p className="ready">Skill requirements met.</p> : (
                  <p className="muted">
                    Still needed: {quest.blockingSkills.map((skill) =>
                      `${skill.required} ${title(skill.skill)} (currently ${skill.currentLevel})`
                    ).join(', ')}
                  </p>
                )}
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
