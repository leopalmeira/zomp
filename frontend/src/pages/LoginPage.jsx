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
            <div style={{marginTop:'24px', display:'flex', flexDirection:'column', gap:'12px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <div style={{flex:1, height:'1px', background:'rgba(255,255,255,0.1)'}}></div>
                <span style={{fontSize:'0.7rem', color:'#71717a', fontWeight:700, textTransform:'uppercase'}}>ou entrar com</span>
                <div style={{flex:1, height:'1px', background:'rgba(255,255,255,0.1)'}}></div>
              </div>
              
              <button 
                type="button" 
                onClick={async () => {
                  alert('Integrando com Google Account...');
                  // Em produÃ§Ã£o aqui viria o token do Google
                }}
                style={{
                  width:'100%', padding:'14px', borderRadius:'14px', background:'#fff', border:'none',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
                  color:'#18181b', fontWeight:700, cursor:'pointer', fontSize:'0.95rem'
                }}
              >
                <img src="https://www.google.com/favicon.ico" alt="G" style={{width:'18px'}} />
                Conta Google
              </button>

              <p className="auth-link">
                Ainda nÃ£o Ã© parceiro? <br/>
                <Link to={registerLink} className="register-highlight">Criar minha conta agora</Link>
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
