import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../supabaseClient'
import { notifyBoth } from '../utils/notify'
import './DayModal.css'

const SHARED_COLOR = '#9b111e'
const CROWN_COLOR  = '#c8a200'

export default function DayModal({ day, events, user, userColor, profiles, onClose, onRefresh }) {
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [isShared, setIsShared] = useState(false)
  const [isImportant, setIsImportant] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [saveError, setSaveError] = useState('')

  const label = format(day, "d 'de' MMMM", { locale: ptBR })
  const dateKey = format(day, 'yyyy-MM-dd')

  async function addEvent(e) {
    e.preventDefault()
    if (!title.trim() || !time.trim()) return
    setSaving(true)
    setSaveError('')
    const { error } = await supabase.from('events').insert({
      date: dateKey,
      title: title.trim(),
      time: time.trim(),
      user_id: user.id,
      is_shared: isShared,
      is_important: isImportant,
    })
    if (error) {
      setSaveError(error.message)
    } else {
      const myProfile = profiles?.[user.id]
      const who = isShared ? '❤️ Para os dois' : `📅 ${myProfile?.name || 'Alguém'}`
      const dateStr = format(day, "d 'de' MMMM", { locale: ptBR })
      const msg = `${who} adicionou um compromisso:\n*${title.trim()}* às ${time}\n${dateStr}`
      if (profiles) notifyBoth(profiles, msg)

      setTitle('')
      setTime('')
      setIsShared(false)
      setIsImportant(false)
      await onRefresh()
    }
    setSaving(false)
  }

  async function deleteEvent(id) {
    setDeleting(id)
    await supabase.from('events').delete().eq('id', id)
    await onRefresh()
    setDeleting(null)
  }

  const sorted = [...events].sort((a, b) => a.time.localeCompare(b.time))

  const btnColor = isShared ? SHARED_COLOR : (userColor || '#1a1a1a')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-date">{label}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-posts">
          {sorted.length === 0 && (
            <p className="modal-empty">Nenhum compromisso ainda</p>
          )}
          {sorted.map(ev => {
            const color = ev.is_shared ? SHARED_COLOR : (ev.profile?.color || '#1a1a1a')
            return (
              <div key={ev.id} className="post-note" style={{ background: color }}>
                <div className="post-pin" />
                <div className="post-content">
                  <span className="post-time">{ev.time}</span>
                  <p className="post-title">
                    {ev.is_important && <span className="post-crown">👑 </span>}
                    {ev.title}
                  </p>
                  <span className="post-who">
                    {ev.is_shared ? '❤️ Para os dois' : (ev.profile?.name || '')}
                  </span>
                </div>
                <button
                  className="post-delete"
                  onClick={() => deleteEvent(ev.id)}
                  disabled={deleting === ev.id}
                >
                  {deleting === ev.id ? '...' : '✕'}
                </button>
              </div>
            )
          })}
        </div>

        <form onSubmit={addEvent} className="modal-form">
          <div className="modal-form-row">
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="modal-input modal-input--time"
              required
            />
            <input
              type="text"
              placeholder="Título do compromisso"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="modal-input modal-input--title"
              required
            />
          </div>

          {saveError && <p style={{color:'#ff6b6b',fontSize:12,margin:0}}>{saveError}</p>}

          <div className="modal-toggles">
            <label className="shared-toggle">
              <input
                type="checkbox"
                checked={isShared}
                onChange={e => setIsShared(e.target.checked)}
              />
              <span
                className="shared-toggle-pill"
                style={{ background: isShared ? SHARED_COLOR : 'rgba(255,255,255,0.1)' }}
              >
                ❤️ Para os dois
              </span>
            </label>

            <label className="shared-toggle">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={e => setIsImportant(e.target.checked)}
              />
              <span
                className="shared-toggle-pill"
                style={{ background: isImportant ? CROWN_COLOR : 'rgba(255,255,255,0.1)' }}
              >
                👑 Importante
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="modal-add-btn"
            disabled={saving || !title || !time}
            style={{ background: btnColor }}
          >
            {saving ? 'Adicionando...' : '+ Adicionar compromisso'}
          </button>
        </form>
      </div>
    </div>
  )
}
