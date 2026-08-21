// Renders the combined-goals plan as a sequential roadmap. Each skill becomes a
// bar whose width is proportional to its estimated hours, laid end to end so the
// chart reads as "do this, then this" and the full width is the total grind.

const title = (value) => value[0].toUpperCase() + value.slice(1)

// A fixed OSRS-leaning palette, cycled by skill index so colours stay stable.
const COLORS = [
  '#c8a860', '#7fa650', '#5a9bd4', '#b9705a',
  '#9b7fc4', '#d49a4e', '#5fb0a0', '#c46f9b',
]

const hoursLabel = (h) =>
  `${h.toLocaleString('en-US', { maximumFractionDigits: h < 10 ? 1 : 0 })}h`

export default function GoalTimeline({ skillPlans }) {
  const estimable = skillPlans.filter((p) => p.hours != null && p.hours > 0)
  const unknown = skillPlans.filter((p) => p.hours == null)
  if (estimable.length === 0) return null

  const total = estimable.reduce((sum, p) => sum + p.hours, 0)

  // Layout in a fixed viewBox; the SVG scales to its container.
  const width = 700
  const rowH = 34
  const barH = 20
  const labelW = 96
  const trackW = width - labelW - 16
  const height = estimable.length * rowH + 24

  let cursor = 0 // running start offset in hours

  return (
    <div className="timeline">
      <div className="timeline-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Training roadmap by estimated hours"
          preserveAspectRatio="xMinYMin meet"
        >
          {/* faint quarter gridlines across the track */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={labelW + trackW * f}
              x2={labelW + trackW * f}
              y1={4}
              y2={height - 20}
              stroke="#3b322a"
              strokeDasharray="2 4"
            />
          ))}

          {estimable.map((p, i) => {
            const x = labelW + (cursor / total) * trackW
            const w = Math.max((p.hours / total) * trackW, 3)
            const y = i * rowH + 8
            const color = COLORS[i % COLORS.length]
            cursor += p.hours
            const showInside = w > 54
            return (
              <g key={p.skill}>
                <text
                  x={labelW - 8}
                  y={y + barH / 2 + 4}
                  textAnchor="end"
                  fill="#c8bda8"
                  fontSize="12"
                >
                  {title(p.skill)}
                </text>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={barH}
                  rx="3"
                  fill={color}
                  opacity="0.9"
                >
                  <title>
                    {title(p.skill)} · lv {p.currentLevel}→{p.targetLevel} ·{' '}
                    {hoursLabel(p.hours)}
                  </title>
                </rect>
                <text
                  x={showInside ? x + w - 6 : x + w + 5}
                  y={y + barH / 2 + 4}
                  textAnchor={showInside ? 'end' : 'start'}
                  fill={showInside ? '#1b1712' : '#948871'}
                  fontSize="11"
                  fontWeight="600"
                >
                  {hoursLabel(p.hours)}
                </text>
              </g>
            )
          })}

          <text x={labelW} y={height - 4} fill="#948871" fontSize="11">
            0h
          </text>
          <text
            x={width - 8}
            y={height - 4}
            textAnchor="end"
            fill="#948871"
            fontSize="11"
          >
            {hoursLabel(total)} total
          </text>
        </svg>
      </div>
      {unknown.length > 0 && (
        <p className="muted timeline-note">
          No time estimate yet for: {unknown.map((p) => title(p.skill)).join(', ')}.
        </p>
      )}
    </div>
  )
}
