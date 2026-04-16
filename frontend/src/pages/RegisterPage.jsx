import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../services/api'
import './Auth.css'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'PASSENGER',
    referrerQrCode: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/login')
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
          <div className="logo-icon">Z</div>
          <h1>Zomp</h1>
          <p className="auth-subtitle">Crie sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Cadastro</h2>

          {error && <div className="auth-error">{error}</div>}

          <div className="input-group">
            <label htmlFor="reg-name">Nome completo</label>
            <input
              id="reg-name"
              className="input"
              type="text"
              placeholder="João Silva"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-email">E-mail</label>
            <input
              id="reg-email"
              className="input"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-password">Senha</label>
            <input
              id="reg-password"
              className="input"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div className="input-group">
            <label>Eu sou:</label>
            <div className="role-selector">
              <button
                type="button"
                id="role-passenger"
                className={`role-option ${form.role === 'PASSENGER' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: 'PASSENGER' })}
              >
                <span className="role-emoji">🧑</span>
                Passageiro
              </button>
              <button
                type="button"
                id="role-driver"
                className={`role-option ${form.role === 'DRIVER' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: 'DRIVER' })}
              >
                <span className="role-emoji">🚗</span>
                Motorista
              </button>
            </div>
          </div>

          {form.role === 'PASSENGER' && (
            <div className="input-group animate-fade-in">
              <label htmlFor="reg-referral">Código de indicação (opcional)</label>
              <input
                id="reg-referral"
                className="input"
                type="text"
                placeholder="Código QR do motorista"
                value={form.referrerQrCode}
                onChange={(e) => setForm({ ...form, referrerQrCode: e.target.value })}
              />
            </div>
          )}

          <button
            id="register-submit"
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Criando...' : 'Criar conta'}
          </button>

          <p className="auth-link">
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
