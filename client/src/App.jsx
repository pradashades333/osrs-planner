import { useState } from 'react'
import './App.css'
import Modal from './components/Modal'
import SkillCell from './components/SkillCell'
import MethodCard from './components/MethodCard'
import PlannerPanel from './components/PlannerPanel'

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3000').replace(/\/$/, '')

// Canonical OSRS skills interface order, read left to right.
const SKILL_ORDER = [
  'attack', 'hitpoints', 'mining',
  'strength', 'agility', 'smithing',
  'defence', 'herblore', 'fishing',
  'ranged', 'thieving', 'cooking',
  'prayer', 'crafting', 'firemaking',
  'magic', 'fletching', 'woodcutting',
  'runecraft', 'slayer', 'farming',
  'construction', 'hunter',
]

const INTENSITIES = ['afk', 'moderate', 'active']

const num = (n) => Number(n).toLocaleString('en-US')

const label = (name) => name[0].toUpperCase() + name.slice(1)

async function getJson(url) {
  const res = await fetch(url)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
  return body
}

function groupByIntensity(methods) {
  const groups = INTENSITIES.map((name) => ({
    name,
    methods: methods.filter((m) => m.intensity === name),
  }))
  const rest = methods.filter((m) => !INTENSITIES.includes(m.intensity))
  if (rest.length) groups.push({ name: 'other', methods: rest })
  return groups.filter((g) => g.methods.length)
}

// Efficiency views: rank the same methods by different tradeoffs. "Fastest"
// wants the highest XP/hr; "cheapest" wants the best gp/hr (profit beats cost,
// so a larger gpPerHour is always better).
const SORT_MODES = [
  { key: 'grouped', label: 'By intensity' },
  { key: 'fastest', label: 'Fastest' },
  { key: 'cheapest', label: 'Cheapest' },
]

function sortMethods(methods, mode) {
  const copy = [...methods]
  if (mode === 'fastest') copy.sort((a, b) => b.xpPerHour - a.xpPerHour)
  if (mode === 'cheapest') copy.sort((a, b) => b.gpPerHour - a.gpPerHour)
  return copy
}

function SkillModal({ rsn, skill, level, xp, onClose }) {
  const current = Math.max(1, level)
  const [target, setTarget] = useState(current >= 95 ? 99 : current + 5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [plan, setPlan] = useState(null)
  const [sortMode, setSortMode] = useState('grouped')

  async function showMethods() {
    setLoading(true)
    setError(null)
    setPlan(null)
    try {
      const result = await getJson(
        `${API_BASE}/api/train/${encodeURIComponent(rsn)}` +
          `?skill=${skill}&target=${target}`
      )
      setPlan(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>{label(skill)}</h2>
      <p className="muted">
        level {level} · {num(xp)} xp
      </p>

      <div className="target-row">
        <label>
          Target level
          <input
            type="number"
            min={Math.min(current + 1, 99)}
            max="99"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </label>
        <button onClick={showMethods} disabled={loading}>
          Show methods
        </button>
      </div>

      {error && <p className="banner">{error}</p>}
      {loading && <div className="spinner" />}

      {plan && (
        <>
          <p className="summary">
            {num(plan.xpNeeded)} xp needed to reach level {plan.target}
          </p>
          {plan.methods.length === 0 ? (
            <p className="muted">No methods seeded for this skill/range yet.</p>
          ) : (
            <>
              <div className="sort-toggle" role="group" aria-label="Sort methods">
                {SORT_MODES.map((m) => (
                  <button
                    key={m.key}
                    className={sortMode === m.key ? 'active' : ''}
                    onClick={() => setSortMode(m.key)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {sortMode === 'grouped' ? (
                groupByIntensity(plan.methods).map((group) => (
                  <section key={group.name}>
                    <h3>{group.name}</h3>
                    {group.methods.map((m) => (
                      <MethodCard key={m.methodName} method={m} />
                    ))}
                  </section>
                ))
              ) : (
                <section>
                  {sortMethods(plan.methods, sortMode).map((m, i) => (
                    <MethodCard
                      key={m.methodName}
                      method={m}
                      badge={
                        i === 0
                          ? sortMode === 'fastest'
                            ? 'fastest xp'
                            : 'best value'
                          : null
                      }
                    />
                  ))}
                </section>
              )}
            </>
          )}
        </>
      )}
    </Modal>
  )
}

function App() {
  const [rsn, setRsn] = useState('')
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  async function search(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await getJson(
        `${API_BASE}/api/player/${encodeURIComponent(rsn.trim())}`
      )
      setPlayer(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function newSearch() {
    setPlayer(null)
    setSelected(null)
    setError(null)
    setRsn('')
  }

  const skills = player?.stats?.skills
  const overall = skills?.overall

  return (
    <main className="app">
      {error && <p className="banner">{error}</p>}

      {!player ? (
        <form className="landing" onSubmit={search}>
          <h1>OSRS Training Planner</h1>
          <div className="search-row">
            <input
              type="text"
              value={rsn}
              onChange={(e) => setRsn(e.target.value)}
              placeholder="RSN"
            />
            <button type="submit" disabled={loading || !rsn.trim()}>
              Search
            </button>
          </div>
          {loading && <div className="spinner" />}
        </form>
      ) : (
        <>
          <header className="player-bar">
            <span className="rsn">{player.player.rsn}</span>
            <span className="muted">total level {overall.level}</span>
            <span className="muted">{num(overall.xp)} xp</span>
            <button onClick={newSearch}>New search</button>
          </header>

          <div className="skill-grid">
            {SKILL_ORDER.map((name) => (
              <SkillCell
                key={name}
                name={name}
                level={skills[name].level}
                xp={skills[name].xp}
                onClick={() => setSelected(name)}
              />
            ))}
          </div>
          <PlannerPanel rsn={player.player.rsn} apiBase={API_BASE} />
        </>
      )}

      {selected && (
        <SkillModal
          key={selected}
          rsn={player.player.rsn}
          skill={selected}
          level={skills[selected].level}
          xp={skills[selected].xp}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  )
}

export default App
