import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { login } from '../services/api'
import logoImage from '../assets/logo.png'
import AuthMapBg from '../components/AuthMapBg'
import './Auth.css'

export default function LoginPage({ forceRole }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isDriver = forceRole === 'DRIVER'
  const isAdmin = forceRole === 'ADMIN'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(form)
      if (data.user.role === 'ADMIN') {
        navigate('/admin')
      } else if (data.user.role === 'DRIVER') {
        const hasCompletedProfile = data.user.carPlate && data.user.cnh
        navigate(hasCompletedProfile ? '/motorista/dashboard' : '/motorista/onboarding')
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
    <div className={`auth-page ${isDriver ? 'driver-theme' : ''} ${isAdmin ? 'sistema-admin-v8' : ''}`}>
      <AuthMapBg />

      <div className="auth-container animate-fade-in">

        <div className="logo-container" style={!isAdmin ? { marginBottom: '20px', transform: 'scale(1.2)' } : {}}>
          <img src="/logo.svg" alt="Zomp Logo" className="logo-img-auth" />
        </div>

        {isAdmin && (
          <>
            <h1>Painel Admin</h1>
            <span className="driver-slogan" style={{ color: '#97E900' }}>Acesso restrito ao administrador</span>
            <p className="auth-subtitle">
              Digite suas credenciais de administrador para continuar.
            </p>
          </>
        )}

        {isDriver && (
          <motion.div 
            className="driver-persuasive-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="driver-hero-title">Parceiros.</h1>
            <h2 className="driver-hero-subtitle">AQUI VOCÊ TAMBÉM É INVESTIDOR</h2>
            
            <motion.div 
              className="driver-persuasive-text"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
            >
              <p>Até quando vai ficar fazendo corridas com quem <span className="highlight-red">não te dá renda passiva</span> mesmo quando não está dirigindo?</p>
            </motion.div>
          </motion.div>
        )}

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
            style={{ marginTop: '24px', width: '100%' }}
          >
            {loading ? 'Processando...' : (isAdmin ? 'Acessar Terminal Admin' : 'Entrar na Conta')}
          </button>

          {!isAdmin && (
            <p className="auth-link">
              Novo na Zomp? <Link to={registerLink}>Criar uma conta</Link>
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
