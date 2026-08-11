const label = (name) => name[0].toUpperCase() + name.slice(1)

const iconUrl = (name) =>
  `https://oldschool.runescape.wiki/images/${label(name)}_icon.png`

export default function SkillCell({ name, level, xp, onClick }) {
  return (
    <button className="skill" onClick={onClick} title={label(name)}>
      <img className="skill-icon" src={iconUrl(name)} alt={label(name)} />
      <span className="skill-numbers">
        <span className="skill-level">{level}</span>
        <span className="skill-xp">{Number(xp).toLocaleString('en-US')} xp</span>
      </span>
    </button>
  )
}
