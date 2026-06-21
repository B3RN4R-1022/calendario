import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Calendar from './components/Calendar'
import ProfileSetup from './components/ProfileSetup'
import StatusView from './components/StatusView'
import YearView from './components/YearView'
import './index.css'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(undefined)
  const [view, setView] = useState('status')
  const [calendarDate, setCalendarDate] = useState(new Date())

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadProfile(data.session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) loadProfile(s.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  if (session === undefined || (session && profile === undefined)) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div style={{ color:'rgba(255,255,255,0.4)', fontSize:14 }}>Carregando...</div>
      </div>
    )
  }

  if (!session) return <Login />

  if (!profile?.name) {
    return (
      <ProfileSetup
        user={session.user}
        onDone={() => loadProfile(session.user.id)}
      />
    )
  }

  return (
    <div>
      {view === 'calendar' && (
        <Calendar
          user={session.user}
          current={calendarDate}
          onCurrentChange={setCalendarDate}
          view={view}
          onChangeView={setView}
        />
      )}
      {view === 'status' && (
        <StatusView user={session.user} onChangeView={setView} />
      )}
      {view === 'year' && (
        <YearView
          year={calendarDate.getFullYear()}
          onSelectMonth={(date) => { setCalendarDate(date); setView('calendar') }}
          onChangeView={setView}
        />
      )}
    </div>
  )
}
