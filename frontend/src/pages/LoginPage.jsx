import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../services/api'
import logoImage from '../assets/logo.png'
import './Auth.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // To visually differentiate login, let's allow user to select context before submission if we wanted, 
  // but it's simpler here. The backend detects it automatically.

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(form)
      navigate(data.user.role === 'DRIVER' ? '/driver' : '/passenger')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-glow" />
      <div className="auth-container animate-fade-in-up">
        <div className="auth-logo">
          <img src={logoImage} alt="Zomp Logo" className="logo-image" />
          <h1>Zomp</h1>
          <p className="auth-subtitle">A Mobilidade Inteligente</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-header">
            <h2>Fazer Login</h2>
            <p className="auth-link">Bem-vindo de volta!</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="input-group">
            <label htmlFor="login-email">E-mail</label>
            <input
              id="login-email"
              className="input"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Senha</label>
            <input
              id="login-password"
              className="input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Acessando...' : 'Entrar'}
          </button>

          <p className="auth-link" style={{marginTop: '16px'}}>
            Ainda não tem conta? <Link to="/register">Cadastre-se</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
