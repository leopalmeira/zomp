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
      <div className="auth-container animate-fade-in">
        
        <div className="auth-header">
          <img src={logoImage} alt="Zomp Logo" className="logo-image" />
          <h1>{isDriver ? 'Dirija.' : 'Viaje.'}</h1>
          <p className="auth-subtitle">
            Crie sua conta como {isDriver ? 'motorista parceiro' : 'passageiro'}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={`auth-form ${isDriver ? 'driver-accent' : ''}`}>
          
          {error && <div className="auth-error">⚠ {error}</div>}

          <div className="input-group">
            <label htmlFor="reg-name">Nome e Sobrenome</label>
            <input
              id="reg-name"
              className="input"
              type="text"
              placeholder="Como quer ser chamado?"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-email">Endereço de E-mail</label>
            <input
              id="reg-email"
              className="input"
              type="email"
              placeholder="nome@email.com.br"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-password">Criar Senha</label>
            <input
              id="reg-password"
              className="input"
              type="password"
              placeholder="Mínimo de 6 caracteres"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          {!isDriver && (
            <div className="input-group" style={{ marginTop: '8px' }}>
              <label htmlFor="reg-referral" style={{color: 'var(--primary-hover)'}}>Código Promocional (Opcional)</label>
              <input
                id="reg-referral"
                className="input"
                style={{ backgroundColor: 'var(--primary-subtle)', borderColor: 'transparent' }}
                type="text"
                placeholder="Código do motorista"
                value={form.referrerQrCode}
                onChange={(e) => setForm({ ...form, referrerQrCode: e.target.value })}
              />
            </div>
          )}

          <button
            id="register-submit"
            type="submit"
            className="btn btn-primary btn-submit"
            disabled={loading}
            style={{ marginTop: '16px' }}
          >
            {loading ? 'Processando...' : 'Finalizar Cadastro'}
          </button>
          
          <p className="auth-link">
            Já possui uma conta Zomp? <Link to={loginLink}>Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
