import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { login } from '../services/api'
import logoImage from '../assets/logo.png'
import AuthMapBg from '../components/AuthMapBg'
import './Auth.css'
import { TrendingUp, ArrowRight, ShieldCheck } from 'lucide-react'

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

      {/* Decorative Gradient Overlay for Driver */}
      {isDriver && <div className="driver-ambient-glow"></div>}

      <div className="auth-container animate-fade-in">

        {!isDriver && !isAdmin && (
          <div className="logo-container" style={{ marginBottom: '20px', transform: 'scale(1.2)' }}>
            <img src="/logo.svg" alt="Zomp Logo" className="logo-img-auth" />
          </div>
        )}

        {isAdmin && (
          <>
            <div className="logo-container" style={{ marginBottom: '32px' }}>
              <img src="/logo.svg" alt="Zomp Logo" className="logo-img-auth" style={{ height: '60px' }} />
            </div>
            <h1>Painel Admin</h1>
            <span className="driver-slogan" style={{ color: '#97E900' }}>Acesso restrito ao administrador</span>
            <p className="auth-subtitle">
              Digite suas credenciais de administrador para continuar.
            </p>
          </>
        )}

        {isDriver && (
          <motion.div 
            className="driver-premium-header"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="driver-logo-wrapper">
              <img src="/logo.svg" alt="Zomp" className="driver-logo" />
              <div className="driver-badge">
                <ShieldCheck size={14} className="badge-icon" />
                <span>Para Parceiros</span>
              </div>
            </div>

            <h1 className="driver-hero-title">
              Sua jornada como <br/><span className="text-glow-green">Investidor</span> começa aqui.
            </h1>
            
            <motion.div 
              className="driver-persuasive-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <div className="card-icon-wrapper">
                <TrendingUp size={24} color="#00E676" />
              </div>
              <div className="card-content">
                <p>Até quando vai fazer corridas para quem <strong>não te dá renda passiva</strong> enquanto você descansa?</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className={`auth-form ${isDriver ? 'driver-form-enhanced' : ''}`}>

          {error && <div className="auth-error">⚠ {error}</div>}

          <div className="input-group">
            <label htmlFor="login-email">E-mail de Acesso</label>
            <input
              id="login-email"
              className="input premium-input"
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
              className="input premium-input"
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
            className="btn btn-primary btn-submit enhanced-submit"
            disabled={loading}
          >
            {loading ? 'Autenticando...' : (
              isAdmin ? 'Acessar Terminal' : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  Entrar na Conta <ArrowRight size={20} />
                </span>
              )
            )}
          </button>

          {!isAdmin && (
            <p className="auth-link">
              Ainda não é parceiro? <br/>
              <Link to={registerLink} className="register-highlight">Criar minha conta agora</Link>
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
