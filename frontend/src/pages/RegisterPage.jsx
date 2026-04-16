import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../services/api'
import logoImage from '../assets/logo.png'
import './Auth.css'

export default function RegisterPage() {
  const navigate = useNavigate()
  
  // Step 1 is picking the role. Step 2 is the form.
  const [step, setStep] = useState(1)
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'PASSENGER',
    referrerQrCode: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRoleSelect = (selectedRole) => {
    setForm({ ...form, role: selectedRole })
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isDriver = form.role === 'DRIVER'

  return (
    <div className={`auth-page ${isDriver && step === 2 ? 'driver-theme' : ''}`}>
      <div className="auth-bg-glow" />
      <div className="auth-container animate-fade-in-up">
        
        <div className="auth-logo">
          <img src={logoImage} alt="Zomp Logo" className="logo-image" />
          <h1>Zomp</h1>
          <p className="auth-subtitle">Crie sua conta para começar</p>
        </div>

        {step === 1 ? (
          <div className="auth-form">
            <div className="auth-form-header">
              <h2>Como você quer usar o Zomp?</h2>
            </div>
            
            <div className="role-selector">
              <button
                type="button"
                className="role-option"
                onClick={() => handleRoleSelect('PASSENGER')}
              >
                <div className="role-emoji">🧑</div>
                <div>
                  <h3>Passageiro</h3>
                  <span style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Viajar com segurança</span>
                </div>
              </button>
              
              <button
                type="button"
                className="role-option"
                onClick={() => handleRoleSelect('DRIVER')}
              >
                <div className="role-emoji">🚗</div>
                <div>
                  <h3 style={{color: 'var(--text-primary)'}}>Motorista Parceiro</h3>
                  <span style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Dirigir e ganhar royalties</span>
                </div>
              </button>
            </div>

            <p className="auth-link" style={{marginTop: '16px'}}>
              Já tem conta? <Link to="/login">Entrar</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={`auth-form ${isDriver ? 'driver-accent' : ''}`}>
            <div className="auth-form-header" style={{ position: 'relative' }}>
              <button 
                type="button"
                onClick={() => setStep(1)} 
                style={{ position: 'absolute', left: 0, top: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem'}}
              >
                ←
              </button>
              <h2>Cadastro de {isDriver ? 'Parceiro' : 'Passageiro'}</h2>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div className="input-group">
              <label htmlFor="reg-name">Nome completo</label>
              <input
                id="reg-name"
                className="input"
                type="text"
                placeholder="João Silva"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="reg-email">E-mail</label>
              <input
                id="reg-email"
                className="input"
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="reg-password">Senha</label>
              <input
                id="reg-password"
                className="input"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            {!isDriver && (
              <div className="input-group animate-fade-in">
                <label htmlFor="reg-referral" style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span>Código de convite (Opcional)</span>
                </label>
                <input
                  id="reg-referral"
                  className="input"
                  style={{ backgroundColor: '#e8fbed', borderColor: '#00E676' }}
                  type="text"
                  placeholder="Código do motorista que indicou"
                  value={form.referrerQrCode}
                  onChange={(e) => setForm({ ...form, referrerQrCode: e.target.value })}
                />
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              className="btn btn-block"
              style={isDriver ? { backgroundColor: 'var(--text-primary)', color: 'white' } : { backgroundColor: 'var(--primary)', color: 'white' }}
              disabled={loading}
            >
              {loading ? 'Criando...' : (isDriver ? 'Cadastrar para Dirigir' : 'Criar conta')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
