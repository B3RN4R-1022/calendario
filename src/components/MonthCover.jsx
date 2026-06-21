import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './MonthCover.css'

const MONTH_DEFAULTS = {
  0:  { bg: '#1a1a2e' },
  1:  { bg: '#16213e' },
  2:  { bg: '#0f3460' },
  3:  { bg: '#1b4332' },
  4:  { bg: '#1a3a1a' },
  5:  { bg: '#3d1a00' },
  6:  { bg: '#3d0000' },
  7:  { bg: '#2d1b00' },
  8:  { bg: '#1a0d2e' },
  9:  { bg: '#0d1b2e' },
  10: { bg: '#1a1a1a' },
  11: { bg: '#0a0a0a' },
}

export default function MonthCover({ month, onPrev, onNext, user, onLogout, view, onChangeView }) {
  const [coverUrl, setCoverUrl]   = useState(null)
  const [bgPos, setBgPos]         = useState('50% 50%')
  const [uploading, setUploading] = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [adjustMode, setAdjustMode] = useState(false)
  const [dragState, setDragState] = useState(null)

  const fileRef  = useRef()
  const coverRef = useRef()
  const monthKey = `cover_${month.getFullYear()}_${month.getMonth()}`
  const monthIdx = month.getMonth()

  useEffect(() => {
    loadCover()
    setAdjustMode(false)
  }, [monthKey])

  async function loadCover() {
    const { data } = await supabase
      .from('month_covers')
      .select('url, bg_position')
      .eq('month_key', monthKey)
      .maybeSingle()
    setCoverUrl(data?.url || null)
    setBgPos(data?.bg_position || '50% 50%')
  }

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)

    // Delete old file from storage before uploading new one
    if (coverUrl) {
      try {
        const oldPath = coverUrl.split('/calendar-covers/')[1]?.split('?')[0]
        if (oldPath) await supabase.storage.from('calendar-covers').remove([oldPath])
      } catch (_) {}
    }

    const ext = file.name.split('.').pop()
    // Unique path per upload so CDN never serves a cached version
    const path = `covers/${monthKey}_${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('calendar-covers')
      .upload(path, file)
    if (upErr) { setUploading(false); return }

    const { data: urlData } = supabase.storage
      .from('calendar-covers')
      .getPublicUrl(path)
    const url = urlData.publicUrl

    await supabase.from('month_covers')
      .upsert({ month_key: monthKey, url }, { onConflict: 'month_key' })
    setCoverUrl(url)
    setBgPos('50% 50%')
    setUploading(false)
    setAdjustMode(true)
  }

  function startDrag(clientX, clientY) {
    const [bx, by] = bgPos.split(' ').map(v => parseFloat(v))
    setDragState({ startX: clientX, startY: clientY, startBgX: bx, startBgY: by })
  }

  function moveDrag(clientX, clientY) {
    if (!dragState || !coverRef.current) return
    const { startX, startY, startBgX, startBgY } = dragState
    const w = coverRef.current.offsetWidth
    const h = coverRef.current.offsetHeight
    const newX = Math.max(0, Math.min(100, startBgX - ((clientX - startX) / w) * 100))
    const newY = Math.max(0, Math.min(100, startBgY - ((clientY - startY) / h) * 100))
    setBgPos(`${newX.toFixed(1)}% ${newY.toFixed(1)}%`)
  }

  function endDrag() {
    setDragState(null)
  }

  async function savePosition() {
    await supabase.from('month_covers')
      .upsert({ month_key: monthKey, url: coverUrl, bg_position: bgPos }, { onConflict: 'month_key' })
    setAdjustMode(false)
  }

  function cancelAdjust() {
    loadCover()
    setAdjustMode(false)
  }

  const label = format(month, 'MMMM yyyy', { locale: ptBR })
  const defaultBg = MONTH_DEFAULTS[monthIdx].bg

  const coverStyle = {
    background: coverUrl
      ? `url(${coverUrl}) ${bgPos}/cover no-repeat`
      : defaultBg,
    cursor: adjustMode ? (dragState ? 'grabbing' : 'grab') : 'default',
  }

  return (
    <div
      ref={coverRef}
      className={`cover ${adjustMode ? 'cover--adjust' : ''}`}
      style={coverStyle}
      onMouseDown={adjustMode ? e => { startDrag(e.clientX, e.clientY); e.preventDefault() } : undefined}
      onMouseMove={adjustMode ? e => moveDrag(e.clientX, e.clientY) : undefined}
      onMouseUp={adjustMode ? endDrag : undefined}
      onMouseLeave={adjustMode ? endDrag : undefined}
      onTouchStart={adjustMode ? e => { const t = e.touches[0]; startDrag(t.clientX, t.clientY) } : undefined}
      onTouchMove={adjustMode ? e => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY); e.preventDefault() } : undefined}
      onTouchEnd={adjustMode ? endDrag : undefined}
    >
      <div className="cover-overlay" />

      {adjustMode ? (
        <div className="cover-adjust-ui">
          <p className="cover-adjust-hint">✋ Arraste para ajustar o enquadramento</p>
          <div className="cover-adjust-btns">
            <button className="cover-adjust-cancel" onClick={cancelAdjust}>✕ Cancelar</button>
            <button className="cover-adjust-save"   onClick={savePosition}>✓ Salvar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="cover-top">
            <div className="cover-user">
              <span className="cover-avatar">{user.email[0].toUpperCase()}</span>
              <button onClick={onLogout} className="cover-logout">Sair</button>
            </div>

            <div className="cover-menu-wrapper">
              <button className="cover-menu-btn" onClick={() => setMenuOpen(o => !o)}>☰</button>
              {menuOpen && (
                <div className="cover-menu-dropdown">
                  {[
                    { id: 'calendar', icon: '📅', label: 'Calendário' },
                    { id: 'status',   icon: '🏷️',  label: 'Status' },
                    { id: 'year',     icon: '🗓️',  label: 'Ano' },
                  ].map(t => (
                    <button
                      key={t.id}
                      className={`cover-menu-item ${view === t.id ? 'active' : ''}`}
                      onClick={() => { onChangeView(t.id); setMenuOpen(false) }}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                  <div className="cover-menu-divider" />
                  <button
                    className="cover-menu-item"
                    onClick={() => { fileRef.current.click(); setMenuOpen(false) }}
                  >
                    {uploading ? '⏳ Enviando...' : '📷 Trocar foto'}
                  </button>
                  {coverUrl && (
                    <button
                      className="cover-menu-item"
                      onClick={() => { setAdjustMode(true); setMenuOpen(false) }}
                    >
                      📍 Ajustar foto
                    </button>
                  )}
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="cover-center">
            <button className="cover-nav" onClick={onPrev}>‹</button>
            <h1 className="cover-title">{label.charAt(0).toUpperCase() + label.slice(1)}</h1>
            <button className="cover-nav" onClick={onNext}>›</button>
          </div>
        </>
      )}
    </div>
  )
}
