import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, getCurrentUser, getWallet, getPendingRides, acceptRide, completeRide } from '../services/api'
import { MapContainer, TileLayer, useMap, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './Driver.css'

// Map auto-center
function MapController({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, 15, { duration: 1.2 })
  }, [center, map])
  return null
}

// Pin icon
const driverIcon = L.divIcon({
  className: 'custom-pin-icon',
  html: `<div style="background:#00E676;width:24px;height:24px;border-radius:50%;border:4px solid #18181b;box-shadow:0 3px 10px rgba(0,0,0,0.4);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

export default function DriverDashboard() {
  const navigate = useNavigate()
  const [user] = useState(getCurrentUser())

  useEffect(() => {
    if (!user || user.role !== 'DRIVER') {
      navigate('/motorista')
      return
    }
  }, [])

  // ===== GPS =====
  const [myPos, setMyPos] = useState([-22.9068, -43.1729]) // Rio default
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyPos([pos.coords.latitude, pos.coords.longitude]),
        () => {}, { enableHighAccuracy: true }
      )
    }
  }, [])

  // ===== Online / Offline =====
  const [isOnline, setIsOnline] = useState(false)

  // ===== Wallet =====
  const [wallet, setWallet] = useState({ balance: 0 })
  const fetchWallet = async () => {
    try {
      const data = await getWallet()
      setWallet(data)
    } catch (e) { console.error(e) }
  }
  useEffect(() => { fetchWallet() }, [])

  // ===== Pending Rides =====
  const [pendingRides, setPendingRides] = useState([])
  const [activeRide, setActiveRide] = useState(null)

  useEffect(() => {
    let interval
    if (isOnline && !activeRide) {
      const poll = async () => {
        try {
          const rides = await getPendingRides()
          setPendingRides(rides)
        } catch (e) {}
      }
      poll()
      interval = setInterval(poll, 3000)
    } else {
      setPendingRides([])
    }
    return () => clearInterval(interval)
  }, [isOnline, activeRide])

  const handleAccept = async (rideId) => {
    try {
      const accepted = await acceptRide(rideId)
      setActiveRide(accepted)
      setPendingRides([])
    } catch (e) {
      alert('Corrida indisponível. Tente outra.')
    }
  }

  const handleComplete = async () => {
    try {
      if (activeRide) {
        await completeRide(activeRide.id)
        setActiveRide(null)
        fetchWallet()
      }
    } catch (e) {
      alert('Erro ao finalizar corrida.')
    }
  }

  // ===== Menu =====
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeScreen, setActiveScreen] = useState(null) // PROFILE, HISTORY, CREDITS, ROYALTIES, SUPPORT, FAQ, EXTERNAL, REFERRAL

  // ===== Ride History =====
  const [rideHistory, setRideHistory] = useState([])
  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('zomp_token')
        const res = await fetch('http://localhost:3001/api/rides', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
        const data = await res.json()
        if (Array.isArray(data)) setRideHistory(data)
      } catch (e) {}
    }
    load()
  }, [activeRide])

  // ===== Profile =====
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: ''
  })

  // ===== FAQ =====
  const [openFaq, setOpenFaq] = useState(null)
  const faqs = [
    { q: 'Como funciona o sistema de royalties?', a: 'A cada corrida de um passageiro vinculado a você, R$ 0,10 é creditado automaticamente na sua carteira de royalties. Este vínculo é permanente.' },
    { q: 'Quando posso sacar meus royalties?', a: 'Saques são permitidos a cada 3 meses, com saldo mínimo de R$ 1,00. O valor é transferido para sua conta bancária cadastrada.' },
    { q: 'Como indicar um passageiro?', a: 'Compartilhe seu QR Code exclusivo com o passageiro. Ele pode escanear durante o cadastro e o vínculo é feito automaticamente.' },
    { q: 'E se o passageiro não veio por indicação?', a: 'Na primeira corrida que você concluir com um passageiro sem vínculo, ele será automaticamente vinculado a você!' },
    { q: 'Posso pegar corridas de outros apps?', a: 'Sim! Na seção "Corridas Externas" você pode configurar integração com outros aplicativos de mobilidade urbana.' },
    { q: 'Quem é a Zomp?', a: 'A Zomp é uma plataforma de mobilidade que valoriza o motorista parceiro com um sistema de comissões permanentes. Cada passageiro que você conquista gera benefícios para toda a sua carreira na plataforma.' }
  ]

  // ===== QR =====
  const [copied, setCopied] = useState(false)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(user?.qrCode || '')}&bgcolor=ffffff&color=18181b`

  const handleCopy = () => {
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

  const openScreen = (screen) => {
    setActiveScreen(screen)
    setMenuOpen(false)
  }

  // ===== RENDER =====
  return (
    <div className="driver-app">
      {/* MAP */}
      <div className="driver-map-bg">
        <MapContainer
          center={myPos}
          zoom={15}
          zoomControl={false}
          attributionControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <MapController center={myPos} />
          <Marker position={myPos} icon={driverIcon} />
        </MapContainer>
      </div>

      {/* TOP HEADER */}
      <div className="driver-top-header">
        <button className="driver-menu-btn" onClick={() => setMenuOpen(true)}>☰</button>

        <button
          className={`driver-status-pill ${isOnline ? 'online' : ''}`}
          onClick={() => setIsOnline(!isOnline)}
        >
          <span className="status-dot"></span>
          {isOnline ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* BOTTOM BAR */}
      <div className="driver-bottom-bar">
        {/* Active Ride */}
        {activeRide ? (
          <div className="active-ride-card">
            <div className="active-ride-header">
              <h3>🚗 Viagem em Andamento</h3>
              <span style={{fontSize:'0.8rem',color:'#059669',fontWeight:700}}>ATIVA</span>
            </div>
            <div className="active-ride-body">
              <div className="active-ride-info">
                <div className="info-row">
                  <span className="info-label">Passageiro</span>
                  <span className="info-value">{activeRide.passenger?.name || 'Passageiro'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Origem</span>
                  <span className="info-value">{activeRide.origin || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Destino</span>
                  <span className="info-value">{activeRide.destination || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Distância</span>
                  <span className="info-value">{activeRide.distanceKm} km</span>
                </div>
                <div className="info-row" style={{background:'#ecfdf5',padding:'8px 12px',borderRadius:'8px',marginTop:'4px'}}>
                  <span className="info-label" style={{color:'#065f46'}}>Ganho</span>
                  <span className="info-value" style={{color:'#059669',fontSize:'1.2rem'}}>R$ {activeRide.price?.toFixed(2)}</span>
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{width:'100%',padding:'14px',fontSize:'1rem',fontWeight:800,borderRadius:'12px',background:'linear-gradient(135deg, #059669, #00E676)',color:'#000',border:'none',cursor:'pointer'}}
                onClick={handleComplete}
              >
                ✓ Finalizar Corrida
              </button>
            </div>
          </div>

        ) : pendingRides.length > 0 ? (
          /* Show first pending ride as a card */
          <div className="ride-request-card">
            <div className="request-header">
              <div>
                <div className="label">Nova Corrida</div>
                <div style={{fontSize:'0.85rem',fontWeight:600,color:'#d4d4d8',marginTop:'2px'}}>
                  {pendingRides[0].passenger?.name || 'Passageiro'}
                </div>
              </div>
              <div className="price">R$ {pendingRides[0].price?.toFixed(2)}</div>
            </div>
            <div className="request-body">
              <div className="request-route">
                <div className="route-dots">
                  <div className="dot-green"></div>
                  <div className="dot-line"></div>
                  <div className="dot-red"></div>
                </div>
                <div className="route-texts">
                  <div className="route-label">Embarque</div>
                  <div className="route-addr">{pendingRides[0].origin || 'Origem'}</div>
                  <div className="route-label">Destino</div>
                  <div className="route-addr">{pendingRides[0].destination || 'Destino'}</div>
                </div>
              </div>
              <div className="request-meta">
                <span className="meta-tag">📏 {pendingRides[0].distanceKm} km</span>
                <span className="meta-tag">{pendingRides[0].vehicleType === 'car' ? '🚗 Carro' : '🏍️ Moto'}</span>
              </div>
              <div className="request-actions">
                <button className="btn-accept" onClick={() => handleAccept(pendingRides[0].id)}>
                  Aceitar
                </button>
                <button className="btn-reject" onClick={() => setPendingRides(prev => prev.slice(1))}>
                  Recusar
                </button>
              </div>
            </div>
          </div>

        ) : (
          /* Idle Message */
          <div className={`driver-idle-msg ${isOnline ? 'online-msg' : 'offline-msg'}`}>
            {isOnline ? (
              <>
                <div className="driver-spinner" style={{marginBottom:'12px'}}>
                  <div className="spinner-ring"></div>
                </div>
                <h3>Conectado</h3>
                <p>Buscando corridas na sua região...</p>
              </>
            ) : (
              <>
                <h3>Você está offline</h3>
                <p>Fique online para começar a receber corridas.</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ===== SIDE MENU ===== */}
      {menuOpen && (
        <div className="driver-side-overlay" onClick={() => setMenuOpen(false)}>
          <div className="driver-side-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Profile Section */}
            <div className="drawer-profile-section">
              <div className="drawer-avatar">{user?.name?.charAt(0) || 'M'}</div>
              <div className="drawer-name">{user?.name}</div>
              <div className="drawer-email">{user?.email || 'motorista@zomp.app'}</div>
            </div>

            {/* Nav Items */}
            <nav className="drawer-nav">
              <button className="drawer-nav-item" onClick={() => openScreen('PROFILE')}>
                <span className="nav-icon">👤</span> Meu Perfil
              </button>
              <button className="drawer-nav-item" onClick={() => openScreen('HISTORY')}>
                <span className="nav-icon">📋</span> Histórico
              </button>
              <button className="drawer-nav-item" onClick={() => openScreen('CREDITS')}>
                <span className="nav-icon">💰</span> Créditos
              </button>
              <button className="drawer-nav-item" onClick={() => openScreen('ROYALTIES')}>
                <span className="nav-icon">👑</span> Royalties
              </button>
              <div className="drawer-nav-separator"></div>
              <button className="drawer-nav-item" onClick={() => openScreen('REFERRAL')}>
                <span className="nav-icon">🔗</span> Indicar Passageiro
              </button>
              <button className="drawer-nav-item" onClick={() => openScreen('EXTERNAL')}>
                <span className="nav-icon">🔄</span> Corridas Externas
              </button>
              <div className="drawer-nav-separator"></div>
              <button className="drawer-nav-item" onClick={() => openScreen('SUPPORT')}>
                <span className="nav-icon">🎧</span> Suporte
              </button>
              <button className="drawer-nav-item" onClick={() => openScreen('FAQ')}>
                <span className="nav-icon">❓</span> FAQ
              </button>
            </nav>

            {/* Footer */}
            <div className="drawer-footer">
              <button className="drawer-nav-item" style={{color:'#ef4444'}} onClick={handleLogout}>
                <span className="nav-icon">🚪</span> Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== INNER SCREENS ===== */}

      {/* PROFILE */}
      {activeScreen === 'PROFILE' && (
        <div className="driver-inner-screen">
          <div className="inner-header">
            <button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button>
            <h2>Meu Perfil</h2>
          </div>
          <div className="inner-body">
            <div className="profile-card">
              <div className="profile-avatar-lg">{user?.name?.charAt(0)}</div>
              <h3 style={{fontSize:'1.3rem',fontWeight:800}}>{user?.name}</h3>
              <p style={{color:'#71717a',fontWeight:600}}>Motorista Parceiro</p>
            </div>

            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'0.8rem',fontWeight:700,color:'#a1a1aa',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'6px'}}>Nome Completo</label>
              <input
                type="text"
                style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e4e4e7',background:'#f4f4f5',fontWeight:600,fontSize:'1rem',outline:'none'}}
                value={profileData.name}
                onChange={(e) => setProfileData({...profileData, name: e.target.value})}
              />
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'0.8rem',fontWeight:700,color:'#a1a1aa',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'6px'}}>E-mail</label>
              <input
                type="email"
                style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e4e4e7',background:'#f4f4f5',fontWeight:600,fontSize:'1rem',outline:'none'}}
                value={profileData.email}
                onChange={(e) => setProfileData({...profileData, email: e.target.value})}
              />
            </div>
            <div style={{marginBottom:'24px'}}>
              <label style={{display:'block',fontSize:'0.8rem',fontWeight:700,color:'#a1a1aa',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'6px'}}>Telefone</label>
              <input
                type="tel"
                style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e4e4e7',background:'#f4f4f5',fontWeight:600,fontSize:'1rem',outline:'none'}}
                value={profileData.phone}
                placeholder="(00) 00000-0000"
                onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
              />
            </div>
            <button
              style={{width:'100%',padding:'14px',background:'#18181b',color:'#fff',border:'none',borderRadius:'12px',fontWeight:800,fontSize:'1rem',cursor:'pointer'}}
              onClick={() => { alert('Perfil atualizado!'); setActiveScreen(null) }}
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {activeScreen === 'HISTORY' && (
        <div className="driver-inner-screen">
          <div className="inner-header">
            <button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button>
            <h2>Histórico de Corridas</h2>
          </div>
          <div className="inner-body">
            {rideHistory.length === 0 ? (
              <div style={{textAlign:'center',padding:'48px 0'}}>
                <p style={{fontSize:'3rem',marginBottom:'12px'}}>📋</p>
                <p style={{color:'#71717a',fontWeight:700}}>Nenhuma corrida realizada ainda.</p>
              </div>
            ) : (
              rideHistory.map(ride => {
                const d = new Date(ride.createdAt)
                const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
                return (
                  <div key={ride.id} className="driver-card">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                      <span style={{fontWeight:800}}>📅 {dateStr}</span>
                      <span style={{
                        fontWeight:800,
                        color: ride.status === 'COMPLETED' ? '#059669' : ride.status.includes('CANCEL') ? '#ef4444' : '#f59e0b'
                      }}>
                        R$ {ride.price?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div style={{fontSize:'0.85rem',color:'#52525b',marginBottom:'4px'}}>📍 <b>De:</b> {ride.origin || '-'}</div>
                    <div style={{fontSize:'0.85rem',color:'#52525b',marginBottom:'8px'}}>🏁 <b>Para:</b> {ride.destination || '-'}</div>
                    <div style={{display:'flex',gap:'8px'}}>
                      <span className="meta-tag">{ride.vehicleType === 'car' ? '🚗 Carro' : '🏍️ Moto'}</span>
                      <span className="meta-tag">{ride.distanceKm} km</span>
                      <span className="meta-tag" style={{
                        background: ride.status === 'COMPLETED' ? '#ecfdf5' : '#fef2f2',
                        color: ride.status === 'COMPLETED' ? '#059669' : '#ef4444'
                      }}>
                        {ride.status === 'COMPLETED' ? '✓ Concluída' : ride.status}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* CREDITS */}
      {activeScreen === 'CREDITS' && (
        <div className="driver-inner-screen">
          <div className="inner-header">
            <button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button>
            <h2>Créditos</h2>
          </div>
          <div className="inner-body">
            <div className="royalty-balance-card">
              <div className="royalty-label">Saldo Disponível</div>
              <div className="royalty-amount">
                <span style={{fontSize:'1.5rem',color:'#9ca3af'}}>R$</span> {wallet.balance?.toFixed(2) || '0.00'}
              </div>
              <div className="royalty-info">Créditos provenientes de corridas e bônus</div>
            </div>

            <div className="driver-card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:800,fontSize:'1rem'}}>Corridas Hoje</div>
                  <div style={{color:'#71717a',fontSize:'0.85rem',fontWeight:600}}>
                    {rideHistory.filter(r => {
                      const d = new Date(r.createdAt)
                      const today = new Date()
                      return d.toDateString() === today.toDateString() && r.status === 'COMPLETED'
                    }).length} corrida(s)
                  </div>
                </div>
                <span style={{fontSize:'2rem'}}>🚗</span>
              </div>
            </div>

            <div className="driver-card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:800,fontSize:'1rem'}}>Total de Corridas</div>
                  <div style={{color:'#71717a',fontSize:'0.85rem',fontWeight:600}}>
                    {rideHistory.filter(r => r.status === 'COMPLETED').length} corrida(s) concluída(s)
                  </div>
                </div>
                <span style={{fontSize:'2rem'}}>📊</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROYALTIES */}
      {activeScreen === 'ROYALTIES' && (
        <div className="driver-inner-screen">
          <div className="inner-header">
            <button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button>
            <h2>Royalties & Indicações</h2>
          </div>
          <div className="inner-body">
            <div className="royalty-balance-card">
              <div className="royalty-label">Saldo de Royalties</div>
              <div className="royalty-amount">
                <span style={{fontSize:'1.5rem',color:'#9ca3af'}}>R$</span> {wallet.balance?.toFixed(2) || '0.00'}
              </div>
              <div className="royalty-info">R$ 0,10 por corrida de cada passageiro vinculado. Saque a cada 3 meses.</div>
            </div>

            <div className="driver-card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:800}}>Passageiros Vinculados</div>
                <div style={{color:'#71717a',fontSize:'0.85rem',fontWeight:600}}>Indicados + orgânicos</div>
              </div>
              <span style={{fontSize:'1.8rem',fontWeight:800,color:'#059669'}}>—</span>
            </div>

            <div className="driver-card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:800}}>Ciclo de Saque</div>
                <div style={{color:'#71717a',fontSize:'0.85rem',fontWeight:600}}>Mínimo R$ 1,00</div>
              </div>
              <span style={{fontSize:'1rem',fontWeight:800,color:'#f59e0b'}}>3 meses</span>
            </div>

            <button
              style={{width:'100%',padding:'14px',marginTop:'16px',background:'linear-gradient(135deg, #059669, #00E676)',color:'#000',border:'none',borderRadius:'12px',fontWeight:800,fontSize:'1rem',cursor:'pointer',opacity: wallet.balance >= 1 ? 1 : 0.5}}
              disabled={wallet.balance < 1}
              onClick={() => alert('Saque solicitado com sucesso!')}
            >
              {wallet.balance >= 1 ? 'Solicitar Saque' : 'Saldo Insuficiente para Saque'}
            </button>
          </div>
        </div>
      )}

      {/* REFERRAL / INDICAÇÃO */}
      {activeScreen === 'REFERRAL' && (
        <div className="driver-inner-screen">
          <div className="inner-header">
            <button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button>
            <h2>Indicar Passageiro</h2>
          </div>
          <div className="inner-body">
            <div className="qr-referral-card">
              <h3 style={{fontSize:'1.2rem',fontWeight:800,marginBottom:'4px'}}>Seu QR Code</h3>
              <p style={{color:'#71717a',fontSize:'0.9rem',fontWeight:600}}>
                Compartilhe com passageiros para vincular permanentemente e ganhar royalties por cada corrida deles.
              </p>
              <img src={qrUrl} alt="QR Code" />
              <div className="qr-code-display">
                <code>{user?.qrCode || '---'}</code>
                <button
                  style={{padding:'8px 16px',borderRadius:'100px',border:'1px solid #e4e4e7',background:'#fff',fontWeight:700,cursor:'pointer',fontSize:'0.85rem'}}
                  onClick={handleCopy}
                >
                  {copied ? '✓ Copiado!' : '📋 Copiar'}
                </button>
              </div>
            </div>

            <div className="driver-card">
              <h4 style={{fontWeight:800,marginBottom:'8px'}}>Como funciona?</h4>
              <ol style={{paddingLeft:'20px',color:'#52525b',fontSize:'0.9rem',lineHeight:'1.8',fontWeight:600}}>
                <li>Mostre este QR Code para o passageiro</li>
                <li>Ele escaneia no cadastro do app Zomp</li>
                <li>Vínculo permanente criado automaticamente</li>
                <li>Você ganha R$ 0,10 por cada corrida dele</li>
              </ol>
            </div>

            <div className="driver-card" style={{background:'#ecfdf5',borderColor:'#bbf7d0'}}>
              <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                <span style={{fontSize:'1.5rem'}}>💡</span>
                <div>
                  <div style={{fontWeight:800,fontSize:'0.95rem',color:'#065f46'}}>Dica</div>
                  <div style={{fontSize:'0.85rem',color:'#047857',fontWeight:600}}>
                    Mesmo sem indicação, o primeiro passageiro que você levar é vinculado automaticamente a você!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXTERNAL RIDES */}
      {activeScreen === 'EXTERNAL' && (
        <div className="driver-inner-screen">
          <div className="inner-header">
            <button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button>
            <h2>Corridas Externas</h2>
          </div>
          <div className="inner-body">
            <div className="driver-card" style={{textAlign:'center',padding:'32px'}}>
              <span style={{fontSize:'3rem',display:'block',marginBottom:'12px'}}>🔄</span>
              <h3 style={{fontWeight:800,marginBottom:'8px'}}>Integração com Outros Apps</h3>
              <p style={{color:'#71717a',fontWeight:600,fontSize:'0.9rem',marginBottom:'16px'}}>
                Em breve você poderá receber corridas de outros aplicativos diretamente aqui na Zomp.
              </p>
              <div className="driver-card" style={{display:'flex',alignItems:'center',gap:'12px',textAlign:'left'}}>
                <span style={{fontSize:'1.5rem'}}>🟢</span>
                <div>
                  <div style={{fontWeight:800}}>99 / Uber / InDriver</div>
                  <div style={{fontSize:'0.8rem',color:'#f59e0b',fontWeight:700}}>Em desenvolvimento</div>
                </div>
              </div>
              <div className="driver-card" style={{display:'flex',alignItems:'center',gap:'12px',textAlign:'left'}}>
                <span style={{fontSize:'1.5rem'}}>🔵</span>
                <div>
                  <div style={{fontWeight:800}}>Aplicativos regionais</div>
                  <div style={{fontSize:'0.8rem',color:'#f59e0b',fontWeight:700}}>Em desenvolvimento</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUPPORT */}
      {activeScreen === 'SUPPORT' && (
        <div className="driver-inner-screen">
          <div className="inner-header">
            <button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button>
            <h2>Suporte</h2>
          </div>
          <div className="inner-body">
            <div className="driver-card" style={{textAlign:'center',padding:'32px'}}>
              <span style={{fontSize:'3rem',display:'block',marginBottom:'12px'}}>🎧</span>
              <h3 style={{fontWeight:800,marginBottom:'8px'}}>Central de Atendimento</h3>
              <p style={{color:'#71717a',fontWeight:600,fontSize:'0.9rem',marginBottom:'24px'}}>
                Estamos aqui para ajudar você. Escolha um canal:
              </p>
            </div>

            <div className="driver-card" style={{cursor:'pointer'}} onClick={() => window.open('mailto:suporte@zomp.app')}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={{fontSize:'1.3rem'}}>📧</span>
                <div>
                  <div style={{fontWeight:800}}>E-mail</div>
                  <div style={{fontSize:'0.85rem',color:'#71717a',fontWeight:600}}>suporte@zomp.app</div>
                </div>
              </div>
            </div>

            <div className="driver-card" style={{cursor:'pointer'}} onClick={() => window.open('https://wa.me/5500000000000')}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={{fontSize:'1.3rem'}}>💬</span>
                <div>
                  <div style={{fontWeight:800}}>WhatsApp</div>
                  <div style={{fontSize:'0.85rem',color:'#71717a',fontWeight:600}}>Atendimento rápido</div>
                </div>
              </div>
            </div>

            <div className="driver-card" style={{cursor:'pointer'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={{fontSize:'1.3rem'}}>📞</span>
                <div>
                  <div style={{fontWeight:800}}>Telefone</div>
                  <div style={{fontSize:'0.85rem',color:'#71717a',fontWeight:600}}>0800 000 0000</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAQ */}
      {activeScreen === 'FAQ' && (
        <div className="driver-inner-screen">
          <div className="inner-header">
            <button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button>
            <h2>Perguntas Frequentes</h2>
          </div>
          <div className="inner-body">
            {faqs.map((faq, i) => (
              <div key={i} className="faq-item">
                <div className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <span style={{fontSize:'1.2rem',transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)',transition:'transform 0.2s'}}>▾</span>
                </div>
                {openFaq === i && (
                  <div className="faq-answer">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
