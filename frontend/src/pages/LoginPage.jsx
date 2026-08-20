import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGoogleLogin } from '@react-oauth/google'
import { login, googleLogin } from '../services/api'
import AuthMapBg from '../components/AuthMapBg'
import DownloadAppBanner from '../components/DownloadAppBanner'
import './Auth.css'
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'

export default function LoginPage({ forceRole }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref') || ''
  
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const isDriver = forceRole === 'DRIVER'
  const isAdmin = forceRole === 'ADMIN'

  const handleGoogleSuccess = async (tokenResponse) => {
    setGoogleLoading(true)
    setError('')
    try {
      const data = await googleLogin(tokenResponse.access_token, forceRole || 'PASSENGER', refCode)
      if (data.user.role === 'ADMIN') {
        navigate('/admin')
      } else if (data.user.role === 'DRIVER') {
        const hasCompletedProfile = data.user.carPlate && data.user.cnh
        navigate(hasCompletedProfile ? '/motorista/dashboard' : '/motorista/onboarding')
      } else {
        navigate('/passageiro/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Erro no login com Google')
    } finally {
      setGoogleLoading(false)
    }
  }

  const googleLoginAction = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      setGoogleLoading(false)
      setError('Falha ao conectar com o Google')
    }
  });

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

        {/* ===== BANNER BAIXAR APP (DOWNLOAD DIRETO) ===== */}
        {!isAdmin && <DownloadAppBanner role={forceRole || 'PASSENGER'} />}

        {!isDriver && !isAdmin && (
          <>
            <div className="logo-container" style={{ marginBottom: '12px', transform: 'scale(1.2)' }}>
              <img src="/logo.svg" alt="Zomp Logo" className="logo-img-auth" />
            </div>
            <p style={{ 
              textAlign: 'center',
              fontSize: '0.85rem', 
              color: '#97E900', 
              fontWeight: 800, 
              marginBottom: '24px', 
              textTransform: 'uppercase', 
              letterSpacing: '1px',
              textShadow: '0 0 10px rgba(151, 233, 0, 0.3)'
            }}>
              Preço Imbatível Contra a Concorrência ⚡
            </p>
          </>
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
            <div className="auth-extra-actions">
              <div className="auth-divider"><span>ou continue com</span></div>
              <button
                type="button"
                className="btn-google"
                onClick={() => googleLoginAction()}
                disabled={loading || googleLoading}
                title="Acesso instantâneo com sua conta Google"
              >
                {googleLoading ? (
                  <span>Conectando com o Google...</span>
                ) : (
                  <>
                    <svg className="google-icon-svg" viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                    <span>Entrar com Google</span>
                  </>
                )}
              </button>
              <div className="auth-footer-links">
                <p>{isDriver ? 'Ainda não é parceiro?' : 'Novo no Zomp?'}</p>
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
