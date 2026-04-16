import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../services/api'
import logoImage from '../assets/logo.png'
import './Auth.css'

export default function LoginPage({ forceRole }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isDriver = forceRole === 'DRIVER'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(form)
      if (data.user.role === 'DRIVER') {
        navigate('/motorista/dashboard')
      } else {
        navigate('/passageiro/dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const registerLink = isDriver ? '/motorista/cadastro' : '/passageiro/cadastro'

  return (
    <div className={`auth-page ${isDriver ? 'driver-theme' : ''}`}>
      <div className="auth-container animate-fade-in">
        
        <div className="auth-header">
          <img src={logoImage} alt="Zomp Logo" className="logo-image" />
          <h1>{isDriver ? 'Parceiros.' : 'Vamos lá.'}</h1>
          <p className="auth-subtitle">
            {isDriver ? 'Acesse o portal do motorista.' : 'Acesse para pedir sua viagem.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={`auth-form ${isDriver ? 'driver-accent' : ''}`}>
          
          {error && <div className="auth-error">⚠ {error}</div>}

          <div className="input-group">
            <label htmlFor="login-email">Endereço de E-mail</label>
            <input
              id="login-email"
              className="input"
              type="email"
              placeholder="nome@email.com.br"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Senha de Acesso</label>
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
            className="btn btn-primary btn-submit"
            disabled={loading}
            style={{ marginTop: '16px' }}
          >
            {loading ? 'Acessando...' : 'Entrar na Conta'}
          </button>

          <p className="auth-link">
            Novo na Zomp? <Link to={registerLink}>Criar uma conta</Link>
          </p>
        </form>

      </div>
    </div>
  )
}
