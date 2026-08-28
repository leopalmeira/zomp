import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { register } from '../services/api'
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
  const [error, setError] = useState('')

  const isDriver = forceRole === 'DRIVER'

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

        <div className="logo-container" style={{ marginBottom: '8px' }}>
          <img src="/logo.svg" alt="Zomp Logo" className="logo-img-auth" />
        </div>

        <form onSubmit={handleSubmit} className={`auth-form ${isDriver ? 'driver-accent' : ''}`}>

          {error && <div className="auth-error">⚠ {error}</div>}

          {refCode && !isDriver && (
            <div style={{
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              padding: '10px 12px',
              borderRadius: '10px',
              marginBottom: '6px',
              border: '1px solid #34d399',
              boxShadow: '0 4px 12px rgba(5,150,105,0.2)'
            }}>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>
                🌟 Você foi indicado por um motorista parceiro Zomp!
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.65rem', fontWeight: 600, color: '#ecfdf5' }}>
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
            <div className="input-group" style={{ marginTop: '4px' }}>
              <label htmlFor="reg-referral" style={{ color: 'var(--primary-hover)', fontSize: '0.68rem' }}>
                Código de Indicação {refCode ? '(✅ Vinculado!)' : '(Opcional)'}
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
            style={{ marginTop: '8px' }}
          >
            {loading ? 'Processando...' : 'Finalizar Cadastro'}
          </button>

          <p className="auth-link" style={{ marginTop: '8px' }}>
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
