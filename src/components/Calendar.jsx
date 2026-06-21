import { useState, useEffect } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, addMonths, subMonths
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../supabaseClient'
import DayModal from './DayModal'
import MonthCover from './MonthCover'
import './Calendar.css'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function Calendar({ user }) {
  const [current, setCurrent] = useState(new Date())
  const [events, setEvents] = useState([])
  const [profiles, setProfiles] = useState({})
  const [selectedDay, setSelectedDay] = useState(null)
  const [userColor, setUserColor] = useState('#1a1a1a')

  useEffect(() => {
    loadProfiles()
  }, [])

  useEffect(() => {
    loadEvents()
  }, [current])

  async function loadProfiles() {
    const { data } = await supabase.from('user_profiles').select('id, color, name')
    if (data) {
      const map = {}
      data.forEach(p => { map[p.id] = p })
      setProfiles(map)
      if (map[user.id]) setUserColor(map[user.id].color || '#1a1a1a')
    }
  }

  async function loadEvents() {
    const start = format(startOfMonth(current), 'yyyy-MM-dd')
    const end = format(endOfMonth(current), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('time', { ascending: true })
    if (data) setEvents(data)
  }

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart)

  function eventsForDay(day) {
    const key = format(day, 'yyyy-MM-dd')
    return events
      .filter(e => e.date === key)
      .map(e => ({ ...e, profile: profiles[e.user_id] }))
  }

  function eventColor(ev) {
    if (ev.is_shared) return '#9b111e'
    return ev.profile?.color || '#1a1a1a'
  }

  return (
    <div className="cal-wrapper">
      <MonthCover
        month={current}
        onPrev={() => setCurrent(d => subMonths(d, 1))}
        onNext={() => setCurrent(d => addMonths(d, 1))}
        user={user}
        onLogout={() => supabase.auth.signOut()}
      />

      <div className="cal-grid-container">
        <div className="cal-weekdays">
          {WEEKDAYS.map(d => (
            <div key={d} className="cal-weekday">{d}</div>
          ))}
        </div>

        <div className="cal-grid">
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="cal-day cal-day--empty" />
          ))}
          {days.map(day => {
            const dayEvents = eventsForDay(day)
            const isToday = isSameDay(day, new Date())
            return (
              <div
                key={day.toISOString()}
                className={`cal-day ${isToday ? 'cal-day--today' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                <span className="cal-day-num">{format(day, 'd')}</span>
                <div className="cal-day-events">
                  {dayEvents.slice(0, 3).map(ev => (
                    <div
                      key={ev.id}
                      className="cal-event-chip"
                      style={{ background: eventColor(ev) }}
                    >
                      <span className="cal-event-time">{ev.time}</span>
                      <span className="cal-event-title">{ev.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="cal-event-more">+{dayEvents.length - 3}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedDay && (
        <DayModal
          day={selectedDay}
          events={eventsForDay(selectedDay)}
          user={user}
          userColor={userColor}
          onClose={() => setSelectedDay(null)}
          onRefresh={loadEvents}
        />
      )}
    </div>
  )
}
