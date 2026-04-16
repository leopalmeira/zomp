import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, getWallet, requestRide, logout } from '../services/api'
import logoImage from '../assets/logo.png'
import './Dashboard.css'

export default function PassengerDashboard() {
  const navigate = useNavigate()
  const [user] = useState(getCurrentUser())
  const [wallet, setWallet] = useState({ balance: 0 })
  const [rideStatus, setRideStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || user.role !== 'PASSENGER') {
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

  const handleRequestRide = async () => {
    setLoading(true)
    try {
      const ride = await requestRide()
      setRideStatus({ id: ride.id, status: ride.status })
    } catch (err) {
      setRideStatus({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/passageiro')
  }

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
            <span className="dash-user-role">Passageiro</span>
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
          <p>Pronto para sua próxima viagem?</p>
        </section>

        {/* Map Placeholder / Ride Action */}
        <section className="ride-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="ride-map-area">
            <div className="map-placeholder">
              <div className="map-pin">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--primary)" stroke="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3" fill="var(--bg-primary)"/>
                </svg>
              </div>
              <div className="map-ripple" />
              <p className="map-text">Sua localização</p>
            </div>
          </div>

          <div className="ride-actions">
            <button
              id="request-ride-btn"
              className="btn btn-primary btn-block"
              onClick={handleRequestRide}
              disabled={loading}
            >
              {loading ? (
                <span className="loading-dots">Solicitando<span>.</span><span>.</span><span>.</span></span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="16"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  Solicitar Corrida
                </>
              )}
            </button>

            {rideStatus && !rideStatus.error && (
              <div className="ride-status-msg animate-fade-in">
                <div className="status-indicator active" />
                <span>Corrida solicitada! ID: <code>{rideStatus.id?.substring(0, 8)}...</code></span>
              </div>
            )}

            {rideStatus?.error && (
              <div className="ride-status-msg error animate-fade-in">
                <span>{rideStatus.error}</span>
              </div>
            )}
          </div>
        </section>

        {/* Info Cards */}
        <section className="stats-grid animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(0, 230, 118, 0.1)', color: 'var(--primary)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div className="stat-value">—</div>
            <div className="stat-label">Corridas</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--info)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </div>
            <div className="stat-value">{user?.qrCode ? 'Sim' : 'Não'}</div>
            <div className="stat-label">Indicado</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(255, 181, 71, 0.1)', color: 'var(--warning)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div className="stat-value">Ativo</div>
            <div className="stat-label">Status</div>
          </div>
        </section>
      </main>
    </div>
  )
}
