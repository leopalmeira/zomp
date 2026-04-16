import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, getCurrentUser } from '../services/api'
import './Passenger.css'
import realMapBg from '../assets/real_map_bg.png'

export default function PassengerDashboard() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  
  const [origin, setOrigin] = useState('Local atual')
  const [destination, setDestination] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false)
  
  // Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeScreen, setActiveScreen] = useState('MAIN') // MAIN, PROFILE, HISTORY, DELIVERIES, FAVORITES

  // Mock list of favorite drivers
  const [favoriteDrivers, setFavoriteDrivers] = useState([
    { id: 1, name: 'Carlos', car: 'Onix', rating: '4.9', distance: '3 min', img: 'https://i.pravatar.cc/150?img=11' },
    { id: 2, name: 'Ana', car: 'HB20', rating: '5.0', distance: '7 min', img: 'https://i.pravatar.cc/150?img=5' },
    { id: 3, name: 'Marcos', car: 'Argo', rating: '4.8', distance: '12 min', img: 'https://i.pravatar.cc/150?img=12' },
  ])

  const handleLogout = () => {
    logout()
    navigate('/passageiro')
  }

  const toggleSheet = () => {
    setIsSheetCollapsed(!isSheetCollapsed)
  }

  // ============== MENU SCREENS ==============
  const renderMenuContent = () => {
    switch (activeScreen) {
      case 'PROFILE':
        return (
          <div className="menu-sub-screen">
            <h3>Meu Perfil</h3>
            <div className="profile-details">
              <div className="user-avatar-large">{user?.name?.charAt(0) || 'P'}</div>
              <p><strong>Nome:</strong> {user?.name}</p>
              <p><strong>E-mail:</strong> {user?.email}</p>
              <p><strong>Cargo:</strong> {user?.role}</p>
            </div>
            <button className="btn btn-secondary" onClick={() => setActiveScreen('MAIN')}>Voltar</button>
          </div>
        )
      case 'HISTORY':
        return (
          <div className="menu-sub-screen">
            <h3>Histórico de Viagens</h3>
            <div className="history-list">
              <p className="hint-text text-center" style={{marginTop: '40px'}}>Nenhuma viagem recente.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => setActiveScreen('MAIN')} style={{marginTop: 'auto'}}>Voltar</button>
          </div>
        )
      case 'DELIVERIES':
        return (
          <div className="menu-sub-screen">
            <h3>Pedidos de Entrega</h3>
            <div className="history-list">
              <p className="hint-text text-center" style={{marginTop: '40px'}}>Nenhuma entrega solicitada.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => setActiveScreen('MAIN')} style={{marginTop: 'auto'}}>Voltar</button>
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
                  <button className="btn-remove-fav">Remover</button>
                </div>
              ))}
            </div>
            {favoriteDrivers.length < 5 && (
              <button className="btn btn-primary" style={{marginTop: '24px'}}>+ Adicionar Novo Motorista</button>
            )}
            <button className="btn btn-secondary" onClick={() => setActiveScreen('MAIN')} style={{marginTop: 'auto'}}>Voltar</button>
          </div>
        )
      default:
        // MAIN MENU LIST
        return (
          <div className="menu-nav-list">
            <div className="menu-user-header">
              <div className="user-avatar-large">{user?.name?.charAt(0) || 'P'}</div>
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

  return (
    <div className="passenger-app">
      
      {/* Absolute Full Screen Realistic Map Background */}
      <div className="passenger-map-bg" style={{backgroundImage: `url(${realMapBg})`}}>
        <div className="map-overlay-layer"></div>
        {/* Animated Central Pin */}
        <div className="center-pin">
          <div className="pin-head"></div>
          <div className="pin-shadow"></div>
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
            {user?.name?.charAt(0) || 'P'}
          </div>
        </div>
      </div>

      {/* Bottom Sheet Drawer */}
      <div className={`passenger-bottom-sheet ${isSheetCollapsed ? 'collapsed' : ''}`}>
        
        {/* Touchable Drag Handle to collapse/expand */}
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
                value={origin} 
                onChange={(e) => setOrigin(e.target.value)} 
                placeholder="Local de partida" 
              />
              <input 
                type="text" 
                className="route-input end-input" 
                value={destination} 
                onChange={(e) => setDestination(e.target.value)} 
                placeholder="Buscar destino..." 
                autoFocus={!isSheetCollapsed}
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
            </div>
            <p className="hint-text">Eles receberão seu pedido primeiro se estiverem a até 10 min de distância.</p>
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
              <p className="hint-text">Corridas agendadas aparecem para os favoritos associados primeiro na data.</p>
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
