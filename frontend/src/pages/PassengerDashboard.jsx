import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, getCurrentUser } from '../services/api'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './Passenger.css'

// Helper component to bind map center dynamically
function MapController({ center }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, 16)
  }, [center, map])
  return null
}

export default function PassengerDashboard() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  
  // Real GPS State
  const defaultLocation = [-22.9068, -43.1729] // Rio center fallback
  const [mapCenter, setMapCenter] = useState(defaultLocation)
  const [isLocating, setIsLocating] = useState(true)

  // Booking States
  const [origin, setOrigin] = useState('Buscando seu local...')
  const [destination, setDestination] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false)
  
  // Menu & Sub-Menu States
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeScreen, setActiveScreen] = useState('MAIN') 

  // Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editName, setEditName] = useState(user?.name || '')
  const [editEmail, setEditEmail] = useState(user?.email || '')

  // Mock list of favorite drivers
  const [favoriteDrivers, setFavoriteDrivers] = useState([
    { id: 1, name: 'Carlos', car: 'Onix', rating: '4.9', distance: '3 min', img: 'https://i.pravatar.cc/150?img=11' },
    { id: 2, name: 'Ana', car: 'HB20', rating: '5.0', distance: '7 min', img: 'https://i.pravatar.cc/150?img=5' },
    { id: 3, name: 'Marcos', car: 'Argo', rating: '4.8', distance: '12 min', img: 'https://i.pravatar.cc/150?img=12' },
  ])

  // Get User GPS on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude])
          setOrigin('Rua Atual (Modificado pelo Mapa)')
          setIsLocating(false)
        },
        (error) => {
          console.warn("GPS bloqueado ou não disponível, usando padrão.", error)
          setOrigin('Local Padrão (GPS não permitido)')
          setIsLocating(false)
        },
        { enableHighAccuracy: true }
      )
    } else {
      setIsLocating(false)
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/passageiro')
  }

  const toggleSheet = () => {
    setIsSheetCollapsed(!isSheetCollapsed)
  }

  const handleRemoveFav = (id) => {
    setFavoriteDrivers(favoriteDrivers.filter(d => d.id !== id))
  }

  const handleSaveProfile = () => {
    // Save to local storage mock to make it functional without backend endpoint
    const updatedUser = { ...user, name: editName, email: editEmail }
    localStorage.setItem('zomp_user', JSON.stringify(updatedUser))
    setIsEditingProfile(false)
    // Reload instantly propagates the new name to the top components
    window.location.reload()
  }

  // ============== MENU SCREENS ==============
  const renderMenuContent = () => {
    switch (activeScreen) {
      case 'PROFILE':
        return (
          <div className="menu-sub-screen">
            <h3>Meu Perfil</h3>
            <div className="profile-details">
              <div className="user-avatar-large">{editName.charAt(0).toUpperCase()}</div>
              
              {!isEditingProfile ? (
                <>
                  <p><strong>Nome Completo:</strong> {user?.name}</p>
                  <p><strong>Endereço de E-mail:</strong> {user?.email}</p>
                  <p><strong>Cargo Atual:</strong> {user?.role}</p>
                  <button className="btn btn-primary" onClick={() => setIsEditingProfile(true)} style={{marginTop: '24px'}}>Editar Dados</button>
                </>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px'}}>
                  <div>
                    <label style={{fontSize: '0.8rem', fontWeight: 600}}>Seu Nome</label>
                    <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <label style={{fontSize: '0.8rem', fontWeight: 600}}>Seu E-mail</label>
                    <input className="input" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                  </div>
                  <div style={{display: 'flex', gap: '8px', marginTop: '16px'}}>
                    <button className="btn btn-primary" onClick={handleSaveProfile} style={{flex: 1}}>Salvar</button>
                    <button className="btn btn-secondary" onClick={() => setIsEditingProfile(false)} style={{backgroundColor: '#e5e7eb'}}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
            {!isEditingProfile && (
              <button className="btn btn-secondary" onClick={() => setActiveScreen('MAIN')} style={{marginTop: 'auto', backgroundColor: '#e5e7eb'}}>Voltar</button>
            )}
          </div>
        )
      case 'HISTORY':
        return (
          <div className="menu-sub-screen">
            <h3>Histórico de Viagens</h3>
            <div className="history-list">
              <p className="hint-text text-center" style={{marginTop: '40px'}}>Você ainda não realizou viagens.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => setActiveScreen('MAIN')} style={{marginTop: 'auto', backgroundColor: '#e5e7eb'}}>Voltar</button>
          </div>
        )
      case 'DELIVERIES':
        return (
          <div className="menu-sub-screen">
            <h3>Pedidos de Entrega</h3>
            <div className="history-list">
              <p className="hint-text text-center" style={{marginTop: '40px'}}>Nenhuma entrega solicitada.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => setActiveScreen('MAIN')} style={{marginTop: 'auto', backgroundColor: '#e5e7eb'}}>Voltar</button>
          </div>
        )
      case 'FAVORITES':
        return (
          <div className="menu-sub-screen">
            <h3>Gerenciar Favoritos</h3>
            <p className="hint-text">Limite de até 5 favoritos cadastrados.</p>
            <div className="fav-manage-list">
              {favoriteDrivers.map(d => (
                <div key={d.id} className="fav-manage-item">
                  <img src={d.img} alt={d.name} />
                  <span>{d.name}</span>
                  <button className="btn-remove-fav" onClick={() => handleRemoveFav(d.id)}>Remover</button>
                </div>
              ))}
              {favoriteDrivers.length === 0 && (
                <p className="hint-text text-center">Sua lista de favoritos está vazia.</p>
              )}
            </div>
            {favoriteDrivers.length < 5 && (
              <button className="btn btn-primary" style={{marginTop: '24px'}}>+ Adicionar Novo Motorista</button>
            )}
            <button className="btn btn-secondary" onClick={() => setActiveScreen('MAIN')} style={{marginTop: 'auto', backgroundColor: '#e5e7eb'}}>Voltar</button>
          </div>
        )
      default:
        return (
          <div className="menu-nav-list">
            <div className="menu-user-header">
              <div className="user-avatar-large">{user?.name?.charAt(0).toUpperCase() || 'P'}</div>
              <div>
                <h3 style={{margin: 0}}>{user?.name}</h3>
                <span className="badge-nearby">Passageiro</span>
              </div>
            </div>
            <hr />
            <button className="menu-nav-btn" onClick={() => setActiveScreen('PROFILE')}>Meu Perfil</button>
            <button className="menu-nav-btn" onClick={() => setActiveScreen('HISTORY')}>Histórico de Viagens</button>
            <button className="menu-nav-btn" onClick={() => setActiveScreen('DELIVERIES')}>Pedidos de Entrega</button>
            <button className="menu-nav-btn" onClick={() => setActiveScreen('FAVORITES')}>Motoristas Favoritos</button>
            <div className="menu-spacer"></div>
            <hr />
            <button className="menu-nav-btn text-danger" onClick={handleLogout}>Sair do Aplicativo</button>
          </div>
        )
    }
  }

  // Force map to re-render properly if drawer animated over it
  useEffect(() => {
     window.dispatchEvent(new Event('resize'));
  }, [isSheetCollapsed])

  return (
    <div className="passenger-app">
      
      {/* 
        Fully Interactive Draggable Map!
        The CSS overrides Leaflet defaults so it fits our white styling.
      */}
      <div className="passenger-map-bg interactive">
        <MapContainer center={mapCenter} zoom={16} zoomControl={false} style={{ width: '100%', height: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CART</a>'
          />
          <MapController center={mapCenter} />
        </MapContainer>
        
        {/* Floating Pin overlay that stays centered while map is dragged underneath */}
        <div className="absolute-center-pin-wrapper">
          <div className="center-pin modern-dynamic">
            <div className="pin-head"></div>
            <div className="pin-shadow"></div>
          </div>
        </div>
      </div>

      {/* Floating Top Nav */}
      <div className="passenger-top-header">
        <div className="menu-btn" onClick={() => setIsMenuOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </div>
        
        <div className="user-profile">
          <span className="greeting">Olá, {user?.name?.split(' ')[0] || 'Passageiro'}</span>
          <div className="user-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'P'}
          </div>
        </div>
      </div>

      {/* Bottom Sheet Drawer */}
      <div className={`passenger-bottom-sheet ${isSheetCollapsed ? 'collapsed' : ''}`}>
        
        <div className="sheet-drag-area" onClick={toggleSheet}>
          <div className="sheet-handle"></div>
        </div>
        
        <div className="sheet-content-wrapper">
          <h2 className="sheet-title">Para onde vamos?</h2>

          <div className="route-inputs">
            <div className="route-timeline">
              <div className="dot-start"></div>
              <div className="timeline-line"></div>
              <div className="dot-end"></div>
            </div>
            <div className="route-fields">
              <input 
                type="text" 
                className="route-input start-input" 
                value={isLocating ? 'Obtendo GPS...' : origin} 
                onChange={(e) => setOrigin(e.target.value)} 
                placeholder="Local de partida" 
              />
              <input 
                type="text" 
                className="route-input end-input" 
                value={destination} 
                onChange={(e) => setDestination(e.target.value)} 
                placeholder="Buscar destino..." 
              />
            </div>
          </div>

          <div className="favorites-section">
            <div className="section-header">
              <h3>Motoristas Favoritos</h3>
              <span className="badge-nearby">Prioridade</span>
            </div>
            <div className="favorites-scroll">
              {favoriteDrivers.map(driver => (
                <div key={driver.id} className="fav-driver-card">
                  <img src={driver.img} alt={driver.name} className="fav-img" />
                  <div className="fav-info">
                    <span className="fav-name">{driver.name}</span>
                    <span className="fav-dist">{driver.distance}</span>
                  </div>
                </div>
              ))}
              {favoriteDrivers.length === 0 && (
                <p className="hint-text" style={{marginTop: 'auto', marginBottom: 'auto'}}>Sem favoritos.</p>
              )}
            </div>
            <p className="hint-text">Receberão o pedido primeiro se estiverem a até 10 min de distância.</p>
          </div>

          <div className="action-buttons">
            <button className="btn btn-schedule" onClick={() => setIsScheduling(!isScheduling)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Agendar
            </button>
            <button className="btn btn-primary btn-request">
              Confirmar Viagem
            </button>
          </div>

          {isScheduling && (
            <div className="scheduling-panel animate-slide-up">
              <h4>Agendar Partida</h4>
              <div className="scheduling-inputs">
                <input type="date" className="schedule-input" />
                <input type="time" className="schedule-input" />
              </div>
              <p className="hint-text">Corridas agendadas ativam associados primeiro na data escolhida.</p>
            </div>
          )}
        </div>
      </div>

      {/* Side Menu Drawer Overlay */}
      {isMenuOpen && (
        <div className="side-menu-overlay" onClick={() => setIsMenuOpen(false)}>
          <div className="side-menu-drawer animate-slide-right" onClick={e => e.stopPropagation()}>
            <div className="drawer-close" onClick={() => setIsMenuOpen(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
            
            {renderMenuContent()}
            
          </div>
        </div>
      )}

    </div>
  )
}
