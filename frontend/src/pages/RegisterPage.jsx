import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../services/api'
import logoImage from '../assets/logo.png'
import './Auth.css'

export default function RegisterPage({ forceRole }) {
  const navigate = useNavigate()
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: forceRole,
    referrerQrCode: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isDriver = forceRole === 'DRIVER'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate(isDriver ? '/motorista' : '/passageiro')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loginLink = isDriver ? '/motorista' : '/passageiro'

  return (
    <div className={`auth-page ${isDriver ? 'driver-theme' : ''}`}>
      <div className="auth-bg-glow" />
      <div className="auth-container animate-fade-in-up">
        
        <div className="auth-logo">
          <img src={logoImage} alt="Zomp Logo" className="logo-image" />
          <h1>Zomp</h1>
          <p className="auth-subtitle">
            Crie sua conta como {isDriver ? 'Parceiro' : 'Passageiro'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={`auth-form ${isDriver ? 'driver-accent' : ''}`}>
          <div className="auth-form-header">
            <h2>Cadastro de {isDriver ? 'Parceiro' : 'Passageiro'}</h2>
          </div>

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

          {!isDriver && (
            <div className="input-group animate-fade-in">
              <label htmlFor="reg-referral" style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Código de convite (Opcional)</span>
              </label>
              <input
                id="reg-referral"
                className="input"
                style={{ backgroundColor: '#e8fbed', borderColor: '#00E676' }}
                type="text"
                placeholder="Código do motorista que indicou"
                value={form.referrerQrCode}
                onChange={(e) => setForm({ ...form, referrerQrCode: e.target.value })}
              />
            </div>
          )}

          <button
            id="register-submit"
            type="submit"
            className="btn btn-block"
            style={isDriver ? { backgroundColor: 'var(--text-primary)', color: 'white' } : { backgroundColor: 'var(--primary)', color: 'white' }}
            disabled={loading}
          >
            {loading ? 'Criando...' : (isDriver ? 'Cadastrar para Dirigir' : 'Criar conta')}
          </button>
          
          <p className="auth-link" style={{marginTop: '16px'}}>
            Já tem conta? <Link to={loginLink}>Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
