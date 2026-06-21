import './BottomNav.css'

const TABS = [
  { id: 'calendar', icon: '📅', label: 'Calendário' },
  { id: 'status',   icon: '🏷️',  label: 'Status' },
  { id: 'year',     icon: '🗓️',  label: 'Ano' },
]

export default function BottomNav({ view, onChangeView }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(t => (
        <button
          key={t.id}
          className={`bottom-nav-btn ${view === t.id ? 'active' : ''}`}
          onClick={() => onChangeView(t.id)}
        >
          <span className="bottom-nav-icon">{t.icon}</span>
          <span className="bottom-nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
