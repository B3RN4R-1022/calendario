import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../supabaseClient'
import './YearView.css'

export default function YearView({ year, onSelectMonth }) {
  const [covers, setCovers] = useState({})
  const [crownMonths, setCrownMonths] = useState(new Set())

  useEffect(() => {
    loadData()
  }, [year])

  async function loadData() {
    const keys = Array.from({ length: 12 }, (_, i) =>
      `${year}-${String(i + 1).padStart(2, '0')}`
    )
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
      <h2 className="year-heading">{year}</h2>
      <div className="year-grid">
        {Array.from({ length: 12 }, (_, i) => {
          const date = new Date(year, i, 1)
          const key = format(date, 'yyyy-MM')
          const coverUrl = covers[key]
          const hasCrown = crownMonths.has(key)
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
