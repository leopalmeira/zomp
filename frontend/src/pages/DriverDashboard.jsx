import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, getWallet, logout, getPendingRides, acceptRide, completeRide } from '../services/api'
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

  const [isOnline, setIsOnline] = useState(false)
  const [pendingRides, setPendingRides] = useState([])
  const [activeRide, setActiveRide] = useState(null)

  useEffect(() => {
    let interval;
    if (isOnline && !activeRide) {
      interval = setInterval(async () => {
        try {
          const rides = await getPendingRides()
          setPendingRides(rides)
        } catch(e) {}
      }, 3000) // poll every 3 seconds
    } else {
      setPendingRides([])
    }
    return () => clearInterval(interval)
  }, [isOnline, activeRide])

  const handleAcceptRide = async (rideId) => {
    try {
      const accepted = await acceptRide(rideId)
      setActiveRide(accepted)
      setPendingRides([])
    } catch(e) {
      alert("Erro ao aceitar corrida. Talvez já tenha sido chamada.")
    }
  }

  const handleCompleteRide = async () => {
    try {
      if(activeRide) {
        await completeRide(activeRide.id)
        setActiveRide(null)
        alert('Corrida finalizada! Bônus de royalty computado se aplicável.')
        fetchWallet() // reload balance
      }
    } catch(e) {
      alert('Erro ao finalizar corrida.')
    }
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
        {!activeRide && (
          <section className="stats-grid animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            {/* Same stats */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(0, 230, 118, 0.1)', color: 'var(--primary)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
              <div className="stat-value">—</div>
              <div className="stat-label">Indicados</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--info)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
              </div>
              <div className="stat-value">R$ 0,10</div>
              <div className="stat-label">Por corrida</div>
            </div>
          </section>
        )}

        {/* Driver Online Toggle & Rides */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.4s', marginTop: '16px' }}>
          {!activeRide ? (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Modo Motorista</h2>
              <label className="switch" style={{ alignSelf: 'center' }}>
                <input type="checkbox" checked={isOnline} onChange={(e) => setIsOnline(e.target.checked)} />
                <span className="slider round" style={{ background: isOnline ? 'var(--primary)' : '#ccc' }}></span>
              </label>
              <p style={{ color: isOnline ? 'var(--primary)' : '#9ca3af', fontWeight: 'bold' }}>
                {isOnline ? 'Online - Buscando Corridas...' : 'Offline'}
              </p>

              {isOnline && pendingRides.length > 0 && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ fontSize: '1rem', marginTop: '16px' }}>Novas Solicitações:</h3>
                  {pendingRides.map(ride => (
                    <div key={ride.id} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{ride.origin} → {ride.dest || ride.destination}</strong>
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>R$ {ride.price?.toFixed(2)}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        Passageiro: {ride.passenger?.name} • Distância: {ride.distanceKm} km
                      </div>
                      <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={() => handleAcceptRide(ride.id)}>
                        Aceitar Corrida
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card" style={{ border: '2px solid var(--primary)', background: '#ecfdf5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.4rem' }}>Viagem em Progresso</h2>
                <span style={{ fontSize: '1.5rem' }}>📍</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase' }}>Passageiro</div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{activeRide.passenger?.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase' }}>Origem</div>
                  <div style={{ fontWeight: 'bold' }}>{activeRide.origin}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase' }}>Destino</div>
                  <div style={{ fontWeight: 'bold' }}>{activeRide.destination || activeRide.dest}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#d1fae5', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 'bold', color: '#065f46' }}>Ganhos</div>
                  <div style={{ fontWeight: 'bold', color: '#065f46', fontSize: '1.2rem' }}>R$ {activeRide.price?.toFixed(2)}</div>
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', padding: '16px' }} onClick={handleCompleteRide}>
                Finalizar Corrida
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
