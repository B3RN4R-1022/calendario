import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../supabaseClient'
import './YearView.css'

const NAV_ITEMS = [
  { id: 'calendar', icon: '📅', label: 'Calendário' },
  { id: 'status',   icon: '🏷️',  label: 'Status' },
  { id: 'year',     icon: '🗓️',  label: 'Ano' },
]

export default function YearView({ year, onSelectMonth, onChangeView }) {
  const [covers, setCovers] = useState({})
  const [crownMonths, setCrownMonths] = useState(new Set())
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [year])

  async function loadData() {
    // MonthCover saves keys as "cover_YYYY_M" (0-based month index)
    const keys = Array.from({ length: 12 }, (_, i) => `cover_${year}_${i}`)

    const [coversRes, eventsRes] = await Promise.all([
      supabase.from('month_covers').select('month_key, url').in('month_key', keys),
      supabase.from('events').select('date')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)
        .eq('is_important', true),
    ])
    if (coversRes.data) {
      const map = {}
      coversRes.data.forEach(c => { map[c.month_key] = c.url })
      setCovers(map)
    }
    if (eventsRes.data) {
      setCrownMonths(new Set(eventsRes.data.map(e => e.date.slice(0, 7))))
    }
  }

  const now = new Date()

  return (
    <div className="year-view">
      <div className="view-topbar">
        <h2 className="year-heading">{year}</h2>
        <div className="view-menu-wrapper">
          <button className="view-menu-btn" onClick={() => setMenuOpen(o => !o)}>☰</button>
          {menuOpen && (
            <div className="view-menu-dropdown">
              {NAV_ITEMS.map(t => (
                <button
                  key={t.id}
                  className={`view-menu-item ${t.id === 'year' ? 'active' : ''}`}
                  onClick={() => { onChangeView(t.id); setMenuOpen(false) }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="year-grid">
        {Array.from({ length: 12 }, (_, i) => {
          const date = new Date(year, i, 1)
          const coverKey = `cover_${year}_${i}`
          const coverUrl = covers[coverKey]
          const monthKey = format(date, 'yyyy-MM')
          const hasCrown = crownMonths.has(monthKey)
          const isCurrent = i === now.getMonth() && year === now.getFullYear()
          const name = format(date, 'MMMM', { locale: ptBR })

          return (
            <div
              key={i}
              className={`year-month ${isCurrent ? 'year-month--current' : ''}`}
              style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : {}}
              onClick={() => onSelectMonth(date)}
            >
              <div className="year-month-overlay" />
              {hasCrown && <span className="year-crown">👑</span>}
              <span className="year-month-name">{name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
