import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './ProfileSetup.css'

const COLORS = [
  { label: 'Preto (você)', value: '#1a1a1a' },
  { label: 'Azul celeste (ela)', value: '#1a8ab5' },
]

export default function ProfileSetup({ user, onDone }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#1a1a1a')
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    await supabase
      .from('user_profiles')
      .update({ name: name.trim(), color })
      .eq('id', user.id)
    setSaving(false)
    onDone()
  }

  return (
    <div className="profile-bg">
      <div className="profile-card">
        <h2>Configurar perfil</h2>
        <p>Como você quer ser identificado no calendário?</p>
        <form onSubmit={save}>
          <input
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <div className="color-options">
            {COLORS.map(c => (
              <label key={c.value} className={`color-opt ${color === c.value ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="color"
                  value={c.value}
                  checked={color === c.value}
                  onChange={() => setColor(c.value)}
                />
                <span
                  className="color-swatch"
                  style={{ background: c.value, border: c.value === '#1a1a1a' ? '2px solid #fff3' : 'none' }}
                />
                {c.label}
              </label>
            ))}
          </div>
          <button type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Salvando...' : 'Entrar no calendário'}
          </button>
        </form>
      </div>
    </div>
  )
}
