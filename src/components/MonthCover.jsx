import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './MonthCover.css'

const MONTH_DEFAULTS = {
  0:  { bg: '#1a1a2e', label: 'Janeiro' },
  1:  { bg: '#16213e', label: 'Fevereiro' },
  2:  { bg: '#0f3460', label: 'Março' },
  3:  { bg: '#1b4332', label: 'Abril' },
  4:  { bg: '#1a3a1a', label: 'Maio' },
  5:  { bg: '#3d1a00', label: 'Junho' },
  6:  { bg: '#3d0000', label: 'Julho' },
  7:  { bg: '#2d1b00', label: 'Agosto' },
  8:  { bg: '#1a0d2e', label: 'Setembro' },
  9:  { bg: '#0d1b2e', label: 'Outubro' },
  10: { bg: '#1a1a1a', label: 'Novembro' },
  11: { bg: '#0a0a0a', label: 'Dezembro' },
}

export default function MonthCover({ month, onPrev, onNext, user, onLogout }) {
  const [coverUrl, setCoverUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const monthKey = `cover_${month.getFullYear()}_${month.getMonth()}`
  const monthIdx = month.getMonth()

  useEffect(() => {
    loadCover()
  }, [monthKey])

  async function loadCover() {
    const { data } = await supabase
      .from('month_covers')
      .select('url')
      .eq('month_key', monthKey)
      .single()
    setCoverUrl(data?.url || null)
  }

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `covers/${monthKey}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('calendar-covers')
      .upload(path, file, { upsert: true })
    if (upErr) { setUploading(false); return }

    const { data: urlData } = supabase.storage
      .from('calendar-covers')
      .getPublicUrl(path)
    const url = urlData.publicUrl

    await supabase.from('month_covers').upsert({ month_key: monthKey, url })
    setCoverUrl(url)
    setUploading(false)
  }

  const label = format(month, 'MMMM yyyy', { locale: ptBR })
  const defaultBg = MONTH_DEFAULTS[monthIdx].bg

  return (
    <div
      className="cover"
      style={{
        background: coverUrl ? `url(${coverUrl}) center/cover no-repeat` : defaultBg,
      }}
    >
      <div className="cover-overlay" />
      <div className="cover-top">
        <div className="cover-user">
          <span className="cover-avatar">{user.email[0].toUpperCase()}</span>
          <button onClick={onLogout} className="cover-logout">Sair</button>
        </div>
        <button
          className="cover-upload-btn"
          onClick={() => fileRef.current.click()}
          title="Trocar foto do mês"
        >
          {uploading ? '...' : '📷'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <div className="cover-center">
        <button className="cover-nav" onClick={onPrev}>‹</button>
        <h1 className="cover-title">{label.charAt(0).toUpperCase() + label.slice(1)}</h1>
        <button className="cover-nav" onClick={onNext}>›</button>
      </div>
    </div>
  )
}
