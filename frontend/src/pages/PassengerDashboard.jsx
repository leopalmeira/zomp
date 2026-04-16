import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, getCurrentUser } from '../services/api'
import './Passenger.css' // We will create a specific CSS for passenger

export default function PassengerDashboard() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  
  const [origin, setOrigin] = useState('Local atual')
  const [destination, setDestination] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)
  
  const handleLogout = () => {
    logout()
    navigate('/passageiro')
  }

  // Mock list of favorite drivers
  const favoriteDrivers = [
    { id: 1, name: 'Carlos', car: 'Onix', rating: '4.9', distance: '3 min', img: 'https://i.pravatar.cc/150?u=carlos' },
    { id: 2, name: 'Ana', car: 'HB20', rating: '5.0', distance: '7 min', img: 'https://i.pravatar.cc/150?u=ana' },
    { id: 3, name: 'Marcos', car: 'Argo', rating: '4.8', distance: '12 min', img: 'https://i.pravatar.cc/150?u=marcos' },
  ]

  return (
    <div className="passenger-app">
      
      {/* Absolute Full Screen Map Background */}
      <div className="passenger-map-bg">
        <div className="map-overlay-layer"></div>
        {/* Animated Central Pin */}
        <div className="center-pin">
          <div className="pin-head"></div>
          <div className="pin-shadow"></div>
        </div>
      </div>

      {/* Floating Top Nav */}
      <div className="passenger-top-header">
        <div className="menu-btn" onClick={handleLogout}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </div>
        
        <div className="user-profile">
          <span className="greeting">Olá, {user?.name?.split(' ')[0] || 'Passageiro'}</span>
          <div className="user-avatar">
            {user?.name?.charAt(0) || 'P'}
          </div>
        </div>
      </div>

      {/* Bottom Sheet Drawer */}
      <div className="passenger-bottom-sheet">
        
        {/* Drag Handle */}
        <div className="sheet-handle"></div>
        
        <h2 className="sheet-title">Para onde vamos?</h2>

        {/* Input Fields Container */}
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
              autoFocus
            />
          </div>
        </div>

        {/* Favorite Drivers Row */}
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

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="btn btn-schedule" onClick={() => setIsScheduling(!isScheduling)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Agendar
          </button>
          <button className="btn btn-primary btn-request">
            Confirmar e Pedir
          </button>
        </div>

        {/* Mini Scheduling Panel */}
        {isScheduling && (
          <div className="scheduling-panel animate-slide-up">
            <h4>Agendar Partida</h4>
            <div className="scheduling-inputs">
              <input type="date" className="schedule-input" />
              <input type="time" className="schedule-input" />
            </div>
            <p className="hint-text">Intervalos +2h priorizam favoritos disponíveis na data.</p>
          </div>
        )}

      </div>
    </div>
  )
}
