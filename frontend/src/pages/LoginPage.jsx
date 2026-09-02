import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { login } from '../services/api'
import AuthMapBg from '../components/AuthMapBg'
import DownloadAppBanner from '../components/DownloadAppBanner'
import './Auth.css'
import { ArrowRight, ShieldCheck, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react'

export default function LoginPage({ forceRole }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref') || ''
  
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
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
      setError(err.message || 'Erro ao autenticar. Verifique seu e-mail e senha.')
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

      <div className="auth-container">

        {/* Top bar with Download App Pill */}
        <div className="auth-top-section">
          {!isAdmin && <DownloadAppBanner role={forceRole || 'PASSENGER'} />}

          {!isDriver && !isAdmin && (
            <div className="passenger-header-block">
              <div className="logo-container">
                <img src="/logo.svg" alt="Zomp Logo" className="logo-img-auth" />
              </div>
              <p className="passenger-slogan-tag">
                Preço Imbatível Contra a Concorrência ⚡
              </p>
            </div>
          )}

          {isAdmin && (
            <div className="admin-header-block">
              <div className="logo-container" style={{ marginBottom: '24px' }}>
                <img src="/logo.svg" alt="Zomp Logo" className="logo-img-auth" style={{ height: '52px' }} />
              </div>
              <h1>Painel Admin</h1>
              <span className="driver-slogan" style={{ color: '#97E900' }}>Acesso restrito ao administrador</span>
              <p className="auth-subtitle">
                Digite suas credenciais de administrador para continuar.
              </p>
            </div>
          )}

          {isDriver && (
            <motion.div 
              className="driver-premium-header"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="driver-logo-wrapper">
                <img src="/logo.svg" alt="Zomp" className="driver-logo" />
                <div className="driver-badge">
                  <span className="driver-badge-dot"></span>
                  <ShieldCheck size={13} className="badge-icon" />
                  <span>Para Parceiros</span>
                </div>
              </div>

              <h1 className="driver-hero-title">
                Sua jornada como <br/><span className="text-glow-green">Investidor</span> começa aqui.
              </h1>
            </motion.div>
          )}
        </div>

        {/* Form docked cleanly at the bottom */}
        <form onSubmit={handleSubmit} className={`auth-form ${isDriver ? 'driver-form-enhanced' : ''}`}>

          {error && <div className="auth-error">⚠ {error}</div>}

          <div className="input-group">
            <label htmlFor="login-email">E-mail de Acesso</label>
            <div className="input-with-icon">
              <Mail size={16} className="field-icon" />
              <input
                id="login-email"
                className="input premium-input with-leading-icon"
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Senha</label>
            <div className="input-with-icon">
              <Lock size={16} className="field-icon" />
              <input
                id="login-password"
                className="input premium-input with-leading-icon with-trailing-icon"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-submit enhanced-submit"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading-content">
                <span className="auth-spinner"></span> Autenticando...
              </span>
            ) : (
              isAdmin ? 'Acessar Terminal' : (
                <span className="btn-inner-content">
                  <span>Entrar na Conta</span>
                  <ArrowRight size={18} className="btn-arrow-icon" />
                </span>
              )
            )}
          </button>

          {!isAdmin && (
            <div className="auth-extra-actions">
              <div className="auth-footer-links">
                <p className="auth-footer-prompt">
                  {isDriver ? 'Ainda não é parceiro?' : 'Novo no Zomp?'}
                </p>
                <Link to={registerLink} className="btn-secondary-outline">
                  {isDriver ? 'Criar Conta de Motorista' : 'Criar Conta de Passageiro'}
                </Link>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
