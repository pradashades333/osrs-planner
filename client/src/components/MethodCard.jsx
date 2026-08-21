const num = (n) => Number(n).toLocaleString('en-US')

export default function MethodCard({ method, badge }) {
  const gp = method.gpPerHour
  return (
    <article className={`card${badge ? ' card-best' : ''}`}>
      <h4>
        {method.methodName}
        {badge && <span className="best-badge">{badge}</span>}
      </h4>
      <div className="tags">
        <span className="tag">{method.intensity}</span>
        <span className="tag">
          lv {method.fromLevel} → {method.toLevel}
        </span>
        {method.membersOnly && <span className="tag">members</span>}
      </div>
      <p className="rates">
        <span>{num(method.xpPerHour)} xp/hr</span>
        <span className={gp < 0 ? 'cost' : 'profit'}>
          {num(Math.abs(gp))} gp/hr {gp < 0 ? 'cost' : 'profit'}
        </span>
      </p>
      <p className="notes">{method.notes}</p>
      <a href={method.sourceUrl} target="_blank" rel="noreferrer">
        source
      </a>
    </article>
  )
}
