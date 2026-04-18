import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, getCurrentUser, getWallet, getPendingRides, acceptRide, completeRide } from '../services/api'
import { MapContainer, TileLayer, useMap, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './Driver.css'

function MapController({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, 15, { duration: 1.2 })
  }, [center, map])
  return null
}

const driverIcon = L.divIcon({
  className: 'custom-pin-icon',
  html: `<div style="background:#00E676;width:24px;height:24px;border-radius:50%;border:4px solid #18181b;box-shadow:0 3px 10px rgba(0,0,0,0.4);"></div>`,
  iconSize: [24, 24], iconAnchor: [12, 12]
})

const API = 'http://localhost:3001/api'
const getToken = () => localStorage.getItem('zomp_token')

export default function DriverDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(getCurrentUser())

  useEffect(() => {
    if (!user || user.role !== 'DRIVER') { navigate('/motorista'); return }
  }, [])

  // GPS Tracking
  const [myPos, setMyPos] = useState([-22.9068, -43.1729])
  useEffect(() => {
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => setMyPos([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.error(err), 
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      )
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    }
  }, [])

  // Online
  const [isOnline, setIsOnline] = useState(false)

  // Map Theme
  const [darkMap, setDarkMap] = useState(false)
  const lightTile = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

  // Slide to go online
  const [slideX, setSlideX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const slideTrackWidth = 280
  const slideThumbWidth = 60
  const slideThreshold = slideTrackWidth - slideThumbWidth - 10

  const handleSlideStart = (e) => {
    setIsSwiping(true)
  }
  const handleSlideMove = (e) => {
    if (!isSwiping) return
    const touch = e.touches ? e.touches[0] : e
    const track = e.currentTarget.closest('.slide-track')
    if (!track) return
    const rect = track.getBoundingClientRect()
    let x = touch.clientX - rect.left - slideThumbWidth / 2
    x = Math.max(0, Math.min(x, slideTrackWidth - slideThumbWidth))
    setSlideX(x)
  }
  const handleSlideEnd = () => {
    setIsSwiping(false)
    if (slideX >= slideThreshold) {
      if (!user?.cnh || !user?.crlv) {
        setSlideX(0);
        return alert("⚠️ Envie seus documentos no menu 'Documentos & Veículo' antes de ficar online.");
      }
      if (!user?.isApproved) {
        setSlideX(0);
        return alert("⏳ Estamos validando seus dados, isso pode levar até 12 horas. Aguarde a aprovação da Zomp para ficar online.");
      }

      setIsOnline(true)
      setSlideX(0)
    } else {
      setSlideX(0)
    }
  }

  // Wallet & Credits
  const [wallet, setWallet] = useState({ balance: 0 })
  const [credits, setCredits] = useState(0)

  const fetchWallet = async () => {
    try { const d = await getWallet(); setWallet(d) } catch (e) {}
  }
  const fetchCredits = async () => {
    try {
      const res = await fetch(`${API}/credits`, { headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' } })
      const d = await res.json()
      if (d.credits !== undefined) setCredits(d.credits)
    } catch (e) {}
  }
  useEffect(() => { fetchWallet(); fetchCredits() }, [])

  // Pending Rides
  const [pendingRides, setPendingRides] = useState([])
  const [activeRide, setActiveRide] = useState(null)

  useEffect(() => {
    let interval
    if (isOnline && !activeRide) {
      const poll = async () => {
        try { const r = await getPendingRides(); setPendingRides(r) } catch (e) {}
      }
      poll()
      interval = setInterval(poll, 3000)
    } else { setPendingRides([]) }
    return () => clearInterval(interval)
  }, [isOnline, activeRide])

  const handleAccept = async (rideId) => {
    try {
      const accepted = await acceptRide(rideId)
      setActiveRide(accepted)
      setPendingRides([])
      fetchCredits()
    } catch (e) {
      alert(e.message || 'Corrida indisponível.')
    }
  }

  const handleComplete = async () => {
    try {
      if (activeRide) {
        await completeRide(activeRide.id)
        setActiveRide(null)
        fetchWallet()
        fetchCredits()
      }
    } catch (e) { alert('Erro ao finalizar.') }
  }

  // Menu & Screen
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeScreen, setActiveScreen] = useState(null)

  // History
  const [rideHistory, setRideHistory] = useState([])
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/rides`, { headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' } })
        const d = await res.json()
        if (Array.isArray(d)) setRideHistory(d)
      } catch (e) {}
    }
    load()
  }, [activeRide])

  // Profile & Docs
  const [profileData, setProfileData] = useState({ 
    name: user?.name || '', 
    email: user?.email || '', 
    phone: '',
    cnh: user?.cnh || '',
    crlv: user?.crlv || '',
    carPlate: user?.carPlate || '',
    carModel: user?.carModel || '',
    carColor: user?.carColor || '',
    pixKey: user?.pixKey || '',
  })

  // FAQ
  const [openFaq, setOpenFaq] = useState(null)
  const faqs = [
    { q: 'Como funciona o sistema de royalties?', a: 'A cada corrida de um passageiro vinculado a você, R$ 0,10 é creditado automaticamente na sua carteira de royalties. Este vínculo é permanente e você ganha para sempre.' },
    { q: 'Como funciona o sistema de créditos?', a: 'Cada crédito equivale a 1 corrida. Ao aceitar uma corrida, 1 crédito é descontado. Você inicia com 10 créditos grátis e depois pode comprar pacotes de 10, 20 ou 30 créditos.' },
    { q: 'Quando posso sacar meus royalties?', a: 'Saques são permitidos a cada 3 meses, com saldo mínimo de R$ 1,00. O valor é transferido para sua conta bancária cadastrada.' },
    { q: 'Como indicar um passageiro?', a: 'Compartilhe seu QR Code exclusivo. Ele pode escaneá-lo durante o cadastro e será vinculado permanentemente.' },
    { q: 'E se o passageiro não veio por indicação?', a: 'Na primeira corrida que você concluir com um passageiro sem vínculo, ele é automaticamente vinculado a você!' },
    { q: 'Posso pegar corridas de outros apps?', a: 'Em breve! Estamos trabalhando na integração com 99, Uber e InDriver.' }
  ]

  // QR
  const [copied, setCopied] = useState(false)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(user?.qrCode || '')}&bgcolor=ffffff&color=18181b`

  const handleCopy = () => {
    if (user?.qrCode) { navigator.clipboard.writeText(user.qrCode); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const handleLogout = () => { logout(); navigate('/motorista') }
  const openScreen = (s) => { setActiveScreen(s); setMenuOpen(false) }

  // Credit purchase: Payment Initialization (PIX)
  const [pixModal, setPixModal] = useState(null)
  
  const handleBuyCreditsInit = (qty) => {
    const price = (qty * 1.5).toFixed(2)
    const pixPayload = `00020126580014br.gov.bcb.pix0136${Math.random().toString(36).substring(2,15)}-zomp0204${qty}C5204000053039865405${price}5802BR5914ZOMP PAGAMENTOS6009SAO_PAULO62070503***6304ABCD`
    setPixModal({ qty, price, pixKey: pixPayload })
  }

  const handleConfirmPixPayment = async () => {
    try {
      const res = await fetch(`${API}/credits/purchase`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: pixModal.qty })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setCredits(d.credits)
      alert(d.message)
      setPixModal(null)
    } catch (e) { alert(e.message || 'Erro na compra') }
  }

  const completedRides = rideHistory.filter(r => r.status === 'COMPLETED')
  const todayRides = completedRides.filter(r => new Date(r.createdAt).toDateString() === new Date().toDateString())

  return (
    <div className="driver-app">
      {/* MAP */}
      <div className="driver-map-bg">
        <MapContainer center={myPos} zoom={15} zoomControl={false} attributionControl={false} style={{ width: '100%', height: '100%' }}>
          <TileLayer url={darkMap ? darkTile : lightTile} />
          <MapController center={myPos} />
          <Marker position={myPos} icon={driverIcon} />
        </MapContainer>
      </div>

      {/* TOP */}
      <div className="driver-top-header">
        <button className="driver-menu-btn" onClick={() => setMenuOpen(true)}>☰</button>
        {isOnline && (
          <button className="driver-status-pill online" onClick={() => setIsOnline(false)}>
            <span className="status-dot"></span>
            Online
          </button>
        )}
      </div>

      {/* BOTTOM */}
      <div className="driver-bottom-bar">
        {activeRide ? (
          <div className="active-ride-card">
            <div className="active-ride-header">
              <h3>🚗 Viagem em Andamento</h3>
              <span style={{fontSize:'0.75rem',color:'#059669',fontWeight:800,background:'#ecfdf5',padding:'4px 10px',borderRadius:'100px'}}>ATIVA</span>
            </div>
            <div className="active-ride-body">
              <div className="active-ride-info">
                <div className="info-row"><span className="info-label">Passageiro</span><span className="info-value">{activeRide.passenger?.name || 'Passageiro'}</span></div>
                <div className="info-row"><span className="info-label">Origem</span><span className="info-value" style={{maxWidth:'60%',textAlign:'right'}}>{activeRide.origin || '-'}</span></div>
                <div className="info-row"><span className="info-label">Destino</span><span className="info-value" style={{maxWidth:'60%',textAlign:'right'}}>{activeRide.destination || '-'}</span></div>
                <div className="info-row"><span className="info-label">Distância</span><span className="info-value">{activeRide.distanceKm} km</span></div>
                <div className="info-row" style={{background:'#ecfdf5',padding:'10px 14px',borderRadius:'10px',marginTop:'4px'}}>
                  <span className="info-label" style={{color:'#065f46',fontWeight:700}}>Ganho</span>
                  <span className="info-value" style={{color:'#059669',fontSize:'1.3rem'}}>R$ {activeRide.price?.toFixed(2)}</span>
                </div>
              </div>
              <button className="btn-premium btn-green" onClick={handleComplete}>✓ Finalizar Corrida</button>
            </div>
          </div>
        ) : pendingRides.length > 0 ? (
          <div className="ride-request-card">
            <div className="request-header">
              <div>
                <div className="label">Nova Corrida</div>
                <div style={{fontSize:'0.85rem',fontWeight:600,color:'#d4d4d8',marginTop:'2px'}}>{pendingRides[0].passenger?.name || 'Passageiro'}</div>
              </div>
              <div className="price">R$ {pendingRides[0].price?.toFixed(2)}</div>
            </div>
            <div className="request-body">
              <div className="request-route">
                <div className="route-dots"><div className="dot-green"></div><div className="dot-line"></div><div className="dot-red"></div></div>
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
                <span className="meta-tag" style={{background:'#ecfdf5',color:'#059669'}}>🎫 {credits} créditos</span>
              </div>
              <div className="request-actions">
                <button className="btn-accept" onClick={() => handleAccept(pendingRides[0].id)}>Aceitar</button>
                <button className="btn-reject" onClick={() => setPendingRides(prev => prev.slice(1))}>Recusar</button>
              </div>
            </div>
          </div>
        ) : (
          /* Offline = slide to go online */
          !isOnline ? (
            <div className="slide-online-container">
              <div
                className="slide-track"
                onMouseMove={handleSlideMove}
                onMouseUp={handleSlideEnd}
                onMouseLeave={handleSlideEnd}
                onTouchMove={handleSlideMove}
                onTouchEnd={handleSlideEnd}
                style={{width: slideTrackWidth}}
              >
                <div className="slide-label">Deslize para ficar online →</div>
                <div
                  className="slide-thumb"
                  onMouseDown={handleSlideStart}
                  onTouchStart={handleSlideStart}
                  style={{transform: `translateX(${slideX}px)`}}
                >
                  <span>▶</span>
                </div>
              </div>
              <p style={{
                textAlign:'center', marginTop:'14px', fontSize:'0.85rem', fontWeight:700,
                color: (!user?.cnh || !user?.crlv) ? '#ef4444' : (!user?.isApproved ? '#f59e0b' : '#059669')
              }}>
                {(!user?.cnh || !user?.crlv) ? '⚠️ Envio de Documentos Pendente' : (!user?.isApproved ? '⏳ Estamos validando seus dados (até 12h)' : `🎫 ${credits} créditos disponíveis`)}
              </p>
            </div>
          ) : (
            /* Online + no rides available = searching */
            <div className="driver-idle-msg online-msg">
              <div className="spinner-ring"></div>
              <h3>Conectado</h3>
              <p>Buscando corridas na sua região...</p>
              <p style={{marginTop:'8px',fontSize:'0.8rem',color:'#059669',fontWeight:700}}>🎫 {credits} créditos restantes</p>
            </div>
          )
        )}
      </div>

      {/* SIDE MENU */}
      {menuOpen && (
        <div className="driver-side-overlay" onClick={() => setMenuOpen(false)}>
          <div className="driver-side-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-profile-section">
              <div className="drawer-avatar">{user?.name?.charAt(0) || 'M'}</div>
              <div className="drawer-name">{user?.name}</div>
              <div className="drawer-role-tag">Motorista Parceiro</div>
            </div>
            <nav className="drawer-nav">
              <button className="drawer-nav-item" onClick={() => openScreen('PROFILE')}><span className="nav-icon">👤</span>Meu Perfil</button>
              <button className="drawer-nav-item" onClick={() => openScreen('DOCS')}><span className="nav-icon">📄</span>Documentos e Veículo</button>
              <button className="drawer-nav-item" onClick={() => openScreen('HISTORY')}><span className="nav-icon">📋</span>Histórico</button>
              <button className="drawer-nav-item" onClick={() => openScreen('CREDITS')}><span className="nav-icon">🎫</span>Créditos<span style={{marginLeft:'auto',background:'#ecfdf5',color:'#059669',padding:'2px 8px',borderRadius:'100px',fontSize:'0.75rem',fontWeight:800}}>{credits}</span></button>
              <button className="drawer-nav-item" onClick={() => openScreen('ROYALTIES')}><span className="nav-icon">👑</span>Royalties<span style={{marginLeft:'auto',color:'#059669',fontSize:'0.8rem',fontWeight:800}}>R$ {wallet.balance?.toFixed(2)}</span></button>
              <div className="drawer-nav-separator"></div>
              <button className="drawer-nav-item" onClick={() => openScreen('REFERRAL')}><span className="nav-icon">🔗</span>Indicar Passageiro</button>
              <button className="drawer-nav-item" onClick={() => openScreen('EXTERNAL')}><span className="nav-icon">🔄</span>Corridas Externas</button>
              <div className="drawer-nav-separator"></div>
              <button className="drawer-nav-item" onClick={() => openScreen('SUPPORT')}><span className="nav-icon">🎧</span>Suporte</button>
              <button className="drawer-nav-item" onClick={() => openScreen('FAQ')}><span className="nav-icon">❓</span>FAQ</button>
              <div className="drawer-nav-separator"></div>
              <button className="drawer-nav-item" onClick={() => { setDarkMap(!darkMap); setMenuOpen(false) }}>
                <span className="nav-icon">{darkMap ? '☀️' : '🌙'}</span>{darkMap ? 'Mapa Claro' : 'Mapa Escuro'}
              </button>
            </nav>
            <div className="drawer-footer">
              <button className="drawer-nav-item" style={{color:'#ef4444'}} onClick={handleLogout}><span className="nav-icon">🚪</span>Sair</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PROFILE ===== */}
      {activeScreen === 'PROFILE' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Meu Perfil</h2></div>
          <div className="inner-body">
            <div style={{textAlign:'center',marginBottom:'28px'}}>
              <div className="profile-avatar-lg">{user?.name?.charAt(0)}</div>
              <h3 style={{fontSize:'1.2rem',fontWeight:800,marginBottom:'2px'}}>{user?.name}</h3>
              <p style={{color:'#71717a',fontWeight:600,fontSize:'0.9rem'}}>Motorista Parceiro</p>
            </div>
            <div className="form-field"><label className="form-label">Nome Completo</label><input className="form-input" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} /></div>
            <div className="form-field"><label className="form-label">E-mail</label><input className="form-input" type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Telefone</label><input className="form-input" type="tel" placeholder="(00) 00000-0000" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Chave PIX (Para Recebimento)</label><input className="form-input" placeholder="CPF, E-mail, ou Celular" value={profileData.pixKey} onChange={e => setProfileData({...profileData, pixKey: e.target.value})} /></div>
            <button className="btn-premium btn-dark" style={{marginTop:'8px'}} onClick={async () => { 
                try {
                  const res = await fetch(`${API}/user/profile`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(profileData)
                  });
                  if(!res.ok) throw new Error('Erro ao salvar');
                  const updatedUserLocal = {...user, ...profileData};
                  localStorage.setItem('zomp_user', JSON.stringify(updatedUserLocal));
                  setUser(updatedUserLocal);
                  alert('Perfil salvo!');
                  setActiveScreen(null);
                } catch(e) { alert(e.message) }
              }}>Salvar Alterações</button>
          </div>
        </div>
      )}

      {/* ===== DOCUMENTS & VEHICLES ===== */}
      {activeScreen === 'DOCS' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Documentos & Veículo</h2></div>
          <div className="inner-body">
            <div className="section-title">Informações do Veículo</div>
            <div className="premium-card" style={{padding: '16px'}}>
              <div className="form-field"><label className="form-label">Placa do Veículo</label><input className="form-input" placeholder="ABC-1234" value={profileData.carPlate} onChange={e => setProfileData({...profileData, carPlate: e.target.value.toUpperCase()})} /></div>
              <div className="form-field"><label className="form-label">Modelo</label><input className="form-input" placeholder="Ex: Chevrolet Onix" value={profileData.carModel} onChange={e => setProfileData({...profileData, carModel: e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Cor</label><input className="form-input" placeholder="Ex: Prata" value={profileData.carColor} onChange={e => setProfileData({...profileData, carColor: e.target.value})} /></div>
            </div>

            <div className="section-title" style={{marginTop: '20px'}}>Documentos (Fotos)</div>
            <div className="premium-card" style={{padding: '16px'}}>
              <div className="form-field">
                <label className="form-label">CNH</label>
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                  <input type="file" accept="image/*" style={{display:'none'}} id="upload-cnh" onChange={(e) => { if(e.target.files[0]) setProfileData({...profileData, cnh: 'uploaded'})}} />
                  <label htmlFor="upload-cnh" className="btn-premium btn-dark" style={{flex:1, textAlign:'center', padding:'10px'}}>+ Enviar CNH</label>
                  {profileData.cnh && <span style={{color: '#059669', fontWeight: 800}}>✓ OK</span>}
                </div>
              </div>
              <div className="form-field" style={{marginTop: '16px'}}>
                <label className="form-label">CRLV do Veículo</label>
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                  <input type="file" accept="image/*" style={{display:'none'}} id="upload-crlv" onChange={(e) => { if(e.target.files[0]) setProfileData({...profileData, crlv: 'uploaded'})}} />
                  <label htmlFor="upload-crlv" className="btn-premium btn-dark" style={{flex:1, textAlign:'center', padding:'10px'}}>+ Enviar CRLV</label>
                  {profileData.crlv && <span style={{color: '#059669', fontWeight: 800}}>✓ OK</span>}
                </div>
              </div>
            </div>

            <button className="btn-premium btn-green" style={{marginTop:'16px'}} onClick={async () => {
                try {
                  const res = await fetch(`${API}/user/profile`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(profileData)
                  });
                  if(!res.ok) throw new Error('Erro ao salvar');
                  const updatedUserLocal = {...user, ...profileData, isApproved: user.isApproved}; // preserve approval status from local
                  localStorage.setItem('zomp_user', JSON.stringify(updatedUserLocal));
                  setUser(updatedUserLocal);
                  alert('Documentos e dados salvos com sucesso!');
                  setActiveScreen(null);
                } catch(e) { alert(e.message) }
            }}>Salvar Documentos</button>
          </div>
        </div>
      )}

      {/* ===== HISTORY ===== */}
      {activeScreen === 'HISTORY' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Histórico</h2></div>
          <div className="inner-body">
            <div className="stats-row">
              <div className="stat-mini"><div className="stat-num">{completedRides.length}</div><div className="stat-lbl">Total</div></div>
              <div className="stat-mini"><div className="stat-num">{todayRides.length}</div><div className="stat-lbl">Hoje</div></div>
            </div>
            {rideHistory.length === 0 ? (
              <div style={{textAlign:'center',padding:'40px 0'}}><p style={{fontSize:'2.5rem',marginBottom:'12px'}}>📋</p><p style={{color:'#71717a',fontWeight:700,fontSize:'0.95rem'}}>Nenhuma corrida ainda.</p></div>
            ) : rideHistory.map(ride => {
              const d = new Date(ride.createdAt)
              const dt = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
              return (
                <div key={ride.id} className="history-card">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                    <span style={{fontWeight:700,fontSize:'0.85rem',color:'#71717a'}}>{dt}</span>
                    <span style={{fontWeight:800,color: ride.status==='COMPLETED' ? '#059669' : '#ef4444',fontSize:'1.05rem'}}>R$ {ride.price?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div style={{fontSize:'0.85rem',color:'#3f3f46',marginBottom:'4px',fontWeight:600}}>📍 {ride.origin || '-'}</div>
                  <div style={{fontSize:'0.85rem',color:'#3f3f46',marginBottom:'10px',fontWeight:600}}>🏁 {ride.destination || '-'}</div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    <span className="meta-tag">{ride.vehicleType === 'car' ? '🚗' : '🏍️'} {ride.distanceKm} km</span>
                    <span className="meta-tag" style={{background: ride.status==='COMPLETED' ? '#ecfdf5' : '#fef2f2', color: ride.status==='COMPLETED' ? '#059669' : '#ef4444'}}>{ride.status === 'COMPLETED' ? '✓ Concluída' : ride.status}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== CREDITS ===== */}
      {activeScreen === 'CREDITS' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Créditos</h2></div>
          <div className="inner-body">
            <div className="premium-card-dark">
              <div style={{position:'relative',zIndex:2}}>
                <div style={{fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'#9ca3af',marginBottom:'8px'}}>Seus Créditos</div>
                <div style={{display:'flex',alignItems:'baseline',gap:'6px',marginBottom:'6px'}}>
                  <span style={{fontSize:'3rem',fontWeight:800}}>{credits}</span>
                  <span style={{fontSize:'1rem',color:'#9ca3af',fontWeight:600}}>créditos</span>
                </div>
                <div style={{fontSize:'0.8rem',color:'#6b7280'}}>1 crédito = 1 corrida • R$ 1,50 cada</div>
              </div>
            </div>

            {credits <= 3 && (
              <div className="tip-card" style={{background:'#fef2f2',borderColor:'#fecaca'}}>
                <span className="tip-icon">⚠️</span>
                <div><div className="tip-title" style={{color:'#b91c1c'}}>Créditos baixos!</div><div className="tip-text" style={{color:'#dc2626'}}>Compre um pacote para continuar aceitando corridas.</div></div>
              </div>
            )}

            <div className="section-title" style={{marginTop:'20px'}}>Comprar Pacotes</div>

            <div className="credit-package" onClick={() => handleBuyCreditsInit(10)}>
              <div className="credit-pkg-icon" style={{background:'#ecfdf5'}}>🎫</div>
              <div className="credit-pkg-info"><h4>10 Créditos</h4><p>Pacote inicial • 10 corridas</p></div>
              <div className="credit-pkg-price"><div className="price">R$ 15,00</div><div className="unit">R$ 1,50/un</div></div>
            </div>

            <div className="credit-package popular" onClick={() => handleBuyCreditsInit(20)}>
              <div className="credit-pkg-icon" style={{background:'#d1fae5'}}>⭐</div>
              <div className="credit-pkg-info"><h4>20 Créditos</h4><p>Mais popular • 20 corridas</p></div>
              <div className="credit-pkg-price"><div className="price">R$ 30,00</div><div className="unit">R$ 1,50/un</div></div>
            </div>

            <div className="credit-package" onClick={() => handleBuyCreditsInit(30)}>
              <div className="credit-pkg-icon" style={{background:'#fef3c7'}}>🏆</div>
              <div className="credit-pkg-info"><h4>30 Créditos</h4><p>Melhor valor • 30 corridas</p></div>
              <div className="credit-pkg-price"><div className="price">R$ 45,00</div><div className="unit">R$ 1,50/un</div></div>
            </div>

            <div className="tip-card">
              <span className="tip-icon">💡</span>
              <div><div className="tip-title">Boas vindas!</div><div className="tip-text">Todo motorista cadastrado recebe 10 créditos grátis para começar. Após utilizá-los, adquira novos pacotes para continuar operando.</div></div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ROYALTIES ===== */}
      {activeScreen === 'ROYALTIES' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Royalties</h2></div>
          <div className="inner-body">
            <div className="premium-card-dark">
              <div style={{position:'relative',zIndex:2}}>
                <div style={{fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'#9ca3af',marginBottom:'8px'}}>Saldo de Royalties</div>
                <div style={{display:'flex',alignItems:'baseline',gap:'6px',marginBottom:'6px'}}>
                  <span style={{fontSize:'1.2rem',color:'#9ca3af'}}>R$</span>
                  <span style={{fontSize:'3rem',fontWeight:800}}>{wallet.balance?.toFixed(2) || '0.00'}</span>
                </div>
                <div style={{fontSize:'0.8rem',color:'#6b7280'}}>R$ 0,10 por corrida de cada passageiro vinculado</div>
              </div>
            </div>

            <div className="stats-row">
              <div className="stat-mini"><div className="stat-num">—</div><div className="stat-lbl">Vinculados</div></div>
              <div className="stat-mini"><div className="stat-num">3 meses</div><div className="stat-lbl">Ciclo saque</div></div>
            </div>

            <button className="btn-premium btn-green" style={{marginTop:'8px'}} disabled={wallet.balance < 1} onClick={() => alert('Saque solicitado!')}>
              {wallet.balance >= 1 ? '💰 Solicitar Saque' : 'Saldo Insuficiente (mín. R$ 1,00)'}
            </button>

            <div className="tip-card" style={{marginTop:'16px'}}>
              <span className="tip-icon">👑</span>
              <div><div className="tip-title">Como funciona?</div><div className="tip-text">Cada passageiro que você transporta pela primeira vez fica vinculado por 3 anos a você. A cada corrida futura dele, R$ 0,10 é creditado na sua carteira.</div></div>
            </div>
          </div>
        </div>
      )}

      {/* ===== REFERRAL ===== */}
      {activeScreen === 'REFERRAL' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Indicar Passageiro</h2></div>
          <div className="inner-body">
            <div className="qr-card">
              <h3 style={{fontSize:'1.15rem',fontWeight:800,marginBottom:'4px'}}>Seu QR Code</h3>
              <p style={{color:'#71717a',fontSize:'0.85rem',fontWeight:600}}>Compartilhe para vincular passageiros</p>
              <img src={qrUrl} alt="QR Code" />
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',marginTop:'12px'}}>
                <code style={{background:'#f4f4f5',padding:'8px 16px',borderRadius:'100px',fontWeight:700,fontSize:'0.95rem',letterSpacing:'0.05em'}}>{user?.qrCode || '---'}</code>
                <button className="btn-premium btn-dark" style={{width:'auto',padding:'8px 16px',fontSize:'0.85rem',borderRadius:'100px'}} onClick={handleCopy}>
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            </div>

            <div className="section-title">Como funciona</div>
            <div className="premium-card">
              <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
                {['Mostre o QR Code ao passageiro','Ele escaneia durante o cadastro','Vínculo de 3 anos criado!','Ganhe R$ 0,10 por corrida dele'].map((step, i) => (
                  <div key={i} style={{display:'flex',gap:'12px',alignItems:'center'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',background: i < 4 ? '#ecfdf5' : '#f4f4f5',color:'#059669',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'0.8rem',flexShrink:0}}>{i+1}</div>
                    <span style={{fontWeight:600,fontSize:'0.9rem',color:'#3f3f46'}}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="tip-card">
              <span className="tip-icon">💡</span>
              <div><div className="tip-title">Dica</div><div className="tip-text">Mesmo sem indicação, o primeiro passageiro que você levar é vinculado automaticamente a você!</div></div>
            </div>
          </div>
        </div>
      )}

      {/* ===== EXTERNAL ===== */}
      {activeScreen === 'EXTERNAL' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Corridas Externas</h2></div>
          <div className="inner-body">
            <div className="premium-card" style={{textAlign:'center',padding:'32px 20px'}}>
              <span style={{fontSize:'2.5rem',display:'block',marginBottom:'12px'}}>🔄</span>
              <h3 style={{fontWeight:800,fontSize:'1.1rem',marginBottom:'6px'}}>Integração Multi-App</h3>
              <p style={{color:'#71717a',fontWeight:600,fontSize:'0.85rem'}}>Receba corridas de outros aplicativos aqui na Zomp.</p>
            </div>
            {[{name:'99',color:'#00b14f',status:'Em breve'},{name:'Uber',color:'#000',status:'Em breve'},{name:'InDriver',color:'#2dbe60',status:'Em breve'}].map(app => (
              <div key={app.name} className="premium-card" style={{display:'flex',alignItems:'center',gap:'14px'}}>
                <div style={{width:'44px',height:'44px',borderRadius:'12px',background:app.color,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'0.9rem'}}>{app.name.charAt(0)}</div>
                <div style={{flex:1}}><div style={{fontWeight:700}}>{app.name}</div><div style={{fontSize:'0.8rem',color:'#f59e0b',fontWeight:700}}>{app.status}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== SUPPORT ===== */}
      {activeScreen === 'SUPPORT' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Suporte</h2></div>
          <div className="inner-body">
            <div className="premium-card" style={{textAlign:'center',padding:'28px',marginBottom:'20px'}}>
              <span style={{fontSize:'2.5rem',display:'block',marginBottom:'8px'}}>🎧</span>
              <h3 style={{fontWeight:800,fontSize:'1.1rem',marginBottom:'4px'}}>Como podemos ajudar?</h3>
              <p style={{color:'#71717a',fontWeight:600,fontSize:'0.85rem'}}>Escolha um canal de atendimento</p>
            </div>
            {[
              {icon:'📧',title:'E-mail',sub:'suporte@zomp.app',bg:'#eff6ff',action:() => window.open('mailto:suporte@zomp.app')},
              {icon:'💬',title:'WhatsApp',sub:'Atendimento rápido',bg:'#ecfdf5',action:() => window.open('https://wa.me/5500000000000')},
              {icon:'📞',title:'Telefone',sub:'0800 000 ZOMP',bg:'#fef3c7',action:() => {}}
            ].map((item,i) => (
              <div key={i} className="support-item" onClick={item.action}>
                <div className="support-icon" style={{background:item.bg}}>{item.icon}</div>
                <div><div style={{fontWeight:700,fontSize:'0.95rem'}}>{item.title}</div><div style={{fontSize:'0.8rem',color:'#71717a',fontWeight:600}}>{item.sub}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== FAQ ===== */}
      {activeScreen === 'FAQ' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>FAQ</h2></div>
          <div className="inner-body">
            {faqs.map((faq, i) => (
              <div key={i} className="faq-item">
                <div className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <span style={{fontSize:'1rem',transform: openFaq === i ? 'rotate(180deg)' : '',transition:'transform 0.2s',color:'#a1a1aa'}}>▾</span>
                </div>
                {openFaq === i && <div className="faq-answer">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
