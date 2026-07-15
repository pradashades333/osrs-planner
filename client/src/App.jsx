import { useState } from 'react'
import { getPlan, setQuestCompleted } from './api'
import './App.css'

const MODES = ['main', 'ironman', 'hardcore', 'ultimate']

export default function App() {
  const [rsn, setRsn] = useState('')
  const [mode, setMode] = useState('main')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function lookup(event) {
    event?.preventDefault()
    if (!rsn.trim()) return

    setLoading(true)
    setError(null)
    try {
      setData(await getPlan(rsn.trim(), { mode }))
    } catch (err) {
      setError(err.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  async function toggleQuest(slug, completed) {
    try {
      await setQuestCompleted(data.player.rsn, slug, completed)
      setData(await getPlan(data.player.rsn, { mode }))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="app">
      <header>
        <h1>OSRS Quest Planner</h1>
        <p className="tagline">
          Look up an account and see which quests it can start right now.
        </p>
      </header>

      <form className="lookup" onSubmit={lookup}>
        <input
          value={rsn}
          onChange={(e) => setRsn(e.target.value)}
          placeholder="Username"
          maxLength={12}
          aria-label="OSRS username"
        />
        <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Gamemode">
          {MODES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button type="submit" disabled={loading || !rsn.trim()}>
          {loading ? 'Loading…' : 'Plan'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {data && (
        <>
          <PlayerCard player={data.player} plan={data.plan} />
          <Skills skills={data.player.skills} />
          <QuestSection
            title="Can do now"
            quests={data.plan.eligible}
            onToggle={(slug) => toggleQuest(slug, true)}
            actionLabel="Mark done"
          />
          <QuestSection
            title="Blocked"
            quests={data.plan.blocked}
            renderDetail={(quest) => <BlockedReasons quest={quest} />}
          />
          <QuestSection
            title="Completed"
            quests={data.plan.completed}
            onToggle={(slug) => toggleQuest(slug, false)}
            actionLabel="Undo"
          />
          <SuggestedOrder order={data.plan.suggestedOrder} />
        </>
      )}
    </main>
  )
}

function PlayerCard({ player, plan }) {
  return (
    <section className="card player-card">
      <div>
        <h2>{player.rsn}</h2>
        <span className="muted">{player.mode}</span>
      </div>
      <dl className="stats">
        <div>
          <dt>Total level</dt>
          <dd>{player.totalLevel.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Total XP</dt>
          <dd>{player.totalXp.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Quest points</dt>
          <dd>
            {plan.questPoints} / {plan.totalQuestPoints}
          </dd>
        </div>
      </dl>
    </section>
  )
}

function Skills({ skills }) {
  return (
    <section className="card">
      <h2>Skills</h2>
      <ul className="skill-grid">
        {skills.map((skill) => (
          <li key={skill.name}>
            <div className="skill-head">
              <span className="skill-name">{skill.name}</span>
              <span className="skill-level">{skill.level}</span>
            </div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${skill.progress * 100}%` }} />
            </div>
            <span className="muted small">
              {skill.xpToNextLevel > 0
                ? `${skill.xpToNextLevel.toLocaleString()} xp to go`
                : 'maxed'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function QuestSection({ title, quests, onToggle, actionLabel, renderDetail }) {
  if (quests.length === 0) return null

  return (
    <section className="card">
      <h2>
        {title} <span className="count">{quests.length}</span>
      </h2>
      <ul className="quest-list">
        {quests.map((quest) => (
          <li key={quest.slug}>
            <div className="quest-row">
              <div>
                <span className="quest-name">{quest.name}</span>
                <span className="muted small">
                  {' '}
                  {quest.difficulty} · {quest.questPoints} QP
                  {quest.members ? ' · members' : ''}
                </span>
              </div>
              {onToggle && (
                <button type="button" className="ghost" onClick={() => onToggle(quest.slug)}>
                  {actionLabel}
                </button>
              )}
            </div>
            {renderDetail?.(quest)}
          </li>
        ))}
      </ul>
    </section>
  )
}

function BlockedReasons({ quest }) {
  return (
    <ul className="reasons">
      {quest.questPointsShort > 0 && <li>Needs {quest.questPointsShort} more quest points</li>}
      {quest.missingQuests.map((req) => (
        <li key={req.slug}>Requires {req.name}</li>
      ))}
      {quest.missingSkills.map((req) => (
        <li key={req.skill}>
          {req.skill} {req.current} → {req.required} ({req.xpNeeded.toLocaleString()} xp)
        </li>
      ))}
    </ul>
  )
}

function SuggestedOrder({ order }) {
  if (!order?.length) return null

  return (
    <section className="card">
      <h2>Suggested order</h2>
      <p className="muted small">
        Assumes you bank the xp each quest rewards, which can unlock later ones.
      </p>
      <ol className="order-list">
        {order.map((quest) => (
          <li key={quest.slug}>
            {quest.name} <span className="muted small">{quest.questPointsAfter} QP</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
