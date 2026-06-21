import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email ou senha incorretos')
    setLoading(false)
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-hearts">❤️</div>
        <h1 className="login-title">Nosso Calendário</h1>
        <p className="login-sub">Agenda compartilhada do casal</p>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" disabled={loading} className="login-btn">
            {loading ? '...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
