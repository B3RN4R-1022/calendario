import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { sendToUser } from '../utils/notify'
import './StatusView.css'

const TAGS = [
  { label: 'Estudando',        emoji: '📚' },
  { label: 'Assistindo Série', emoji: '📺' },
  { label: 'Assistindo Jogo',  emoji: '⚽' },
  { label: 'Jogando',          emoji: '🎮' },
  { label: 'Trabalhando',      emoji: '💼' },
  { label: 'Almoçando',        emoji: '🍽️' },
  { label: 'Academia',         emoji: '🏋️' },
  { label: 'Dormindo',         emoji: '😴' },
  { label: 'Faculdade',        emoji: '🎓' },
  { label: 'Clínica',          emoji: '🏥' },
  { label: 'Em Casa',          emoji: '🏠' },
  { label: 'Casa de Vó',       emoji: '👵' },
]

const NAV_ITEMS = [
  { id: 'calendar', icon: '📅', label: 'Calendário' },
  { id: 'status',   icon: '🏷️',  label: 'Status' },
  { id: 'year',     icon: '🗓️',  label: 'Ano' },
]

export default function StatusView({ user, onChangeView }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profiles, setProfiles] = useState([])
  const [myStatus, setMyStatus] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProfiles()
    const interval = setInterval(loadProfiles, 15000)
    return () => clearInterval(interval)
  }, [])

  async function loadProfiles() {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, name, color, status, whatsapp_phone, callmebot_key')
    if (data) {
      setProfiles(data)
      const me = data.find(p => p.id === user.id)
      if (me) setMyStatus(me.status || null)
    }
  }

  async function selectTag(tag) {
    const next = myStatus === tag ? null : tag
    setSaving(true)
    await supabase.from('user_profiles').update({ status: next }).eq('id', user.id)
    setMyStatus(next)
    setSaving(false)

    if (next) {
      const me = profiles.find(p => p.id === user.id)
      const partner = profiles.find(p => p.id !== user.id)
      const t = TAGS.find(t => t.label === next)
      if (partner && me) {
        await sendToUser(partner, `${t?.emoji || ''} *${me.name}* está agora:\n${t?.emoji || ''} ${next}`)
      }
    }

    loadProfiles()
  }

  const me = profiles.find(p => p.id === user.id)
  const partner = profiles.find(p => p.id !== user.id)

  function display(status) {
    const t = TAGS.find(t => t.label === status)
    return t ? `${t.emoji} ${t.label}` : null
  }

  return (
    <div className="status-view">
      <div className="view-topbar">
        <h2 className="status-title">Status agora</h2>
        <div className="view-menu-wrapper">
          <button className="view-menu-btn" onClick={() => setMenuOpen(o => !o)}>☰</button>
          {menuOpen && (
            <div className="view-menu-dropdown">
              {NAV_ITEMS.map(t => (
                <button
                  key={t.id}
                  className={`view-menu-item ${t.id === 'status' ? 'active' : ''}`}
                  onClick={() => { onChangeView(t.id); setMenuOpen(false) }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="status-cards">
        {me && (
          <div className="status-card" style={{ borderColor: me.color }}>
            <div className="status-card-name" style={{ color: me.color }}>{me.name} (você)</div>
            <div className="status-card-current">
              {display(myStatus) || <span className="status-empty">Sem status</span>}
            </div>
          </div>
        )}
        {partner && (
          <div className="status-card" style={{ borderColor: partner.color }}>
            <div className="status-card-name" style={{ color: partner.color }}>{partner.name}</div>
            <div className="status-card-current">
              {display(partner.status) || <span className="status-empty">Sem status</span>}
            </div>
          </div>
        )}
      </div>

      <p className="status-section-label">O que você está fazendo?</p>
      <div className="status-grid">
        {TAGS.map(tag => (
          <button
            key={tag.label}
            className={`status-tag-btn ${myStatus === tag.label ? 'active' : ''}`}
            onClick={() => selectTag(tag.label)}
            disabled={saving}
          >
            <span className="status-tag-emoji">{tag.emoji}</span>
            <span className="status-tag-label">{tag.label}</span>
          </button>
        ))}
      </div>

      {myStatus && (
        <button className="status-clear-btn" onClick={() => selectTag(myStatus)}>
          Limpar status
        </button>
      )}
    </div>
  )
}
