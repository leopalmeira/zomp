import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { register, googleLogin } from '../services/api'
import AuthMapBg from '../components/AuthMapBg'
import DownloadAppBanner from '../components/DownloadAppBanner'
import './Auth.css'

export default function RegisterPage({ forceRole }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref') || ''

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: forceRole,
    referrerQrCode: refCode,
  })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const isDriver = forceRole === 'DRIVER'

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
      setError(err.message || 'Erro ao cadastrar com Google')
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
      await register(form)
      
      // Trigger PWA Install if available
      if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        const { outcome } = await window.deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        window.deferredPrompt = null;
      }

      navigate(isDriver ? '/motorista/onboarding' : '/passageiro')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loginLink = isDriver ? '/motorista' : '/passageiro'

  return (
    <div className={`auth-page ${isDriver ? 'driver-theme' : ''}`}>
      <AuthMapBg />

      <div className="auth-container animate-fade-in">

        {/* Banner Baixar App */}
        <DownloadAppBanner role={forceRole || 'PASSENGER'} />

        <div className="logo-container" style={{ marginBottom: '30px', transform: 'scale(1.2)' }}>
          <img src="/logo.svg" alt="Zomp Logo" className="logo-img-auth" />
        </div>

        <form onSubmit={handleSubmit} className={`auth-form ${isDriver ? 'driver-accent' : ''}`}>

          {error && <div className="auth-error">⚠ {error}</div>}

          {refCode && !isDriver && (
            <div style={{
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              padding: '14px 16px',
              borderRadius: '14px',
              marginBottom: '12px',
              border: '2px solid #34d399',
              boxShadow: '0 4px 12px rgba(5,150,105,0.3)'
            }}>
              <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#fff' }}>
                🌟 Você foi indicado por um motorista parceiro Zomp!
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '0.7rem', fontWeight: 600, color: '#ecfdf5' }}>
                Seu vínculo será criado automaticamente ao finalizar o cadastro.
              </p>
            </div>
          )}

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
              <label htmlFor="reg-referral" style={{ color: 'var(--primary-hover)' }}>
                Código de Indicação {refCode ? '(✅ Vinculado automaticamente!)' : '(Opcional)'}
              </label>
              <input
                id="reg-referral"
                className="input"
                style={{
                  backgroundColor: refCode ? 'rgba(5,150,105,0.08)' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: refCode ? '#34d399' : 'rgba(255, 255, 255, 0.1)'
                }}
                type="text"
                placeholder="Código do motorista"
                value={form.referrerQrCode}
                onChange={(e) => setForm({ ...form, referrerQrCode: e.target.value })}
                readOnly={!!refCode}
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

          <div className="auth-extra-actions">
            <div className="auth-divider"><span>ou cadastre-se com</span></div>
            <button
              type="button"
              className="btn-google"
              onClick={() => googleLoginAction()}
              disabled={loading || googleLoading}
              title="Cadastro instantâneo com sua conta Google"
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
                  <span>Cadastrar com Google</span>
                </>
              )}
            </button>
          </div>

          <p className="auth-link" style={{ marginTop: '16px' }}>
            Já possui uma conta Zomp? <Link to={loginLink}>Entrar</Link>
          </p>
        </form>

        <div className="auth-footer-phrase">
          {isDriver ? 'Sua jornada como investidor começa aqui.' : 'Para onde será nossa próxima viagem?'}
        </div>
      </div>
    </div>
  )
}
