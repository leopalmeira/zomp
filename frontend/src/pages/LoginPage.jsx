import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGoogleLogin } from '@react-oauth/google'
import { login, googleLogin } from '../services/api'
import AuthMapBg from '../components/AuthMapBg'
import './Auth.css'
import { ArrowRight, ShieldCheck, Download, Smartphone } from 'lucide-react'

export default function LoginPage({ forceRole }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(true)

  const isDriver = forceRole === 'DRIVER'
  const isAdmin = forceRole === 'ADMIN'

  // Captura o evento de instalação do PWA
  useEffect(() => {
    if (window.deferredPrompt) {
      setInstallPrompt(window.deferredPrompt)
    }
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      window.deferredPrompt = e
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setShowInstallBanner(false)
      }
      setInstallPrompt(null)
      window.deferredPrompt = null
    } else {
      // iOS / Safari: instrução manual
      alert('Para instalar o app:\n\n📱 iPhone/iPad: Toque no botão de compartilhar (⬆️) e depois em "Adicionar à Tela de Início"\n\n📱 Android: Toque nos 3 pontos (⋮) e depois em "Adicionar à tela inicial"')
    }
  }

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true)
    setError('')
    try {
      const data = await googleLogin(tokenResponse.access_token, forceRole || 'PASSENGER')
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
      setLoading(false)
    }
  }

  const googleLoginAction = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setError('Falha ao conectar com o Google')
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
  const appLabel = isDriver ? 'Motorista' : 'Passageiro'
  const appColor = isDriver ? '#00E676' : '#33a3ff'

  return (
    <div className={`auth-page ${isDriver ? 'driver-theme' : ''} ${isAdmin ? 'sistema-admin-v8' : ''}`}>
      <AuthMapBg />

      {/* Decorative Gradient Overlay for Driver */}
      {isDriver && <div className="driver-ambient-glow"></div>}

      <div className="auth-container animate-fade-in">

        {/* ===== BANNER INSTALAR APP (PWA) ===== */}
        {!isAdmin && showInstallBanner && (
          <motion.div
            className="install-app-banner"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{
              background: `linear-gradient(135deg, ${isDriver ? 'rgba(0, 230, 118, 0.12)' : 'rgba(51, 163, 255, 0.12)'} 0%, rgba(0,0,0,0.3) 100%)`,
              border: `1px solid ${isDriver ? 'rgba(0, 230, 118, 0.25)' : 'rgba(51, 163, 255, 0.25)'}`,
              borderRadius: '16px',
              padding: '16px 18px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={handleInstallClick}
          >
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${appColor}, ${isDriver ? '#059669' : '#2563eb'})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 4px 15px ${isDriver ? 'rgba(0, 230, 118, 0.3)' : 'rgba(51, 163, 255, 0.3)'}`,
            }}>
              <Smartphone size={22} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.88rem',
                marginBottom: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <Download size={14} color={appColor} />
                Baixar App {appLabel}
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}>
                Instale na tela inicial para acesso rápido
              </div>
            </div>
            <div style={{
              background: appColor,
              color: '#000',
              padding: '8px 14px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.78rem',
              whiteSpace: 'nowrap',
              boxShadow: `0 2px 8px ${isDriver ? 'rgba(0, 230, 118, 0.3)' : 'rgba(51, 163, 255, 0.3)'}`,
            }}>
              INSTALAR
            </div>
          </motion.div>
        )}

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
                disabled={loading}
              >
                <span style={{fontWeight: 900, fontSize: '1.05rem'}}>G</span>
                Entrar com Google
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
