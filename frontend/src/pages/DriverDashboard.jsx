import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, getWallet, logout } from '../services/api'
import logoImage from '../assets/logo.png'
import './Dashboard.css'

export default function DriverDashboard() {
  const navigate = useNavigate()
  const [user] = useState(getCurrentUser())
  const [wallet, setWallet] = useState({ balance: 0 })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user || user.role !== 'DRIVER') {
      navigate('/login')
      return
    }
    fetchWallet()
  }, [])

  const fetchWallet = async () => {
    try {
      const data = await getWallet()
      setWallet(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCopyCode = () => {
    if (user?.qrCode) {
      navigator.clipboard.writeText(user.qrCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/motorista')
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(user?.qrCode || '')}&bgcolor=1a1f2e&color=00E676`

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-header-inner">
          <div className="dash-brand">
            <img src={logoImage} alt="Zomp" className="logo-image-sm" />
            <span>Zomp</span>
          </div>
          <div className="dash-user-info">
            <span className="dash-user-name">{user?.name}</span>
            <span className="dash-user-role">Motorista</span>
          </div>
          <button id="logout-btn" className="btn-icon" onClick={handleLogout} title="Sair">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <main className="dash-main container">
        {/* Greeting */}
        <section className="dash-greeting animate-fade-in-up">
          <h1>Olá, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Painel do motorista — gerencie seus indicados e royalties.</p>
        </section>

        {/* Wallet Card */}
        <section className="wallet-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="wallet-header">
            <span className="wallet-label">Saldo de Royalties</span>
            <div className="wallet-badge">
              <span className="pulse-dot" />
              Ativo
            </div>
          </div>
          <div className="wallet-balance">
            <span className="currency">R$</span>
            <span className="amount">{wallet.balance?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="wallet-info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>R$ 0,10 por corrida de cada indicado. Saque a cada 3 meses.</span>
          </div>
        </section>

        {/* QR Code Card */}
        <section className="qr-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h2>Seu QR Code de Indicação</h2>
          <p className="qr-desc">Compartilhe este código com passageiros para vincular permanentemente e ganhar royalties por cada corrida.</p>

          <div className="qr-display">
            <div className="qr-image-wrapper">
              <img
                src={qrUrl}
                alt="QR Code de indicação"
                className="qr-image"
              />
              <div className="qr-glow" />
            </div>
          </div>

          <div className="qr-code-text">
            <code id="qr-code-value">{user?.qrCode}</code>
            <button
              id="copy-code-btn"
              className="btn btn-secondary"
              onClick={handleCopyCode}
            >
              {copied ? '✓ Copiado!' : 'Copiar código'}
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="stats-grid animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(0, 230, 118, 0.1)', color: 'var(--primary)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="stat-value">—</div>
            <div className="stat-label">Indicados</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--info)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className="stat-value">R$ 0,10</div>
            <div className="stat-label">Por corrida</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(255, 181, 71, 0.1)', color: 'var(--warning)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <div className="stat-value">3 meses</div>
            <div className="stat-label">Ciclo de saque</div>
          </div>
        </section>
      </main>
    </div>
  )
}
