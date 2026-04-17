import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, getCurrentUser } from '../services/api'
import { MapContainer, TileLayer, useMap, Marker, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './Passenger.css'

// Custom Map Icons
const createIcon = (color) => L.divIcon({
  className: 'custom-pin-icon',
  html: `<div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 4px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
})
const originIcon = createIcon('#00E676') // Green
const destIcon = createIcon('#EF4444') // Red

// Haversine formula to calculate distance in KM
const getDistance = (coords1, coords2) => {
  const [lat1, lon1] = coords1;
  const [lat2, lon2] = coords2;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper to center and bounds
function MapController({ center, markers }) {
  const map = useMap()
  
  useEffect(() => {
    if (markers && markers.length === 2 && markers[0] && markers[1]) {
      const bounds = L.latLngBounds([markers[0], markers[1]])
      map.flyToBounds(bounds, { padding: [50, 50], animate: true })
    } else if (center) {
      map.flyTo(center, 16)
    }
  }, [center, markers, map])
  
  return null
}

export default function PassengerDashboard() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  
  // Base Maps GPS
  const defaultLocation = [-22.9068, -43.1729]
  const [mapCenter, setMapCenter] = useState(defaultLocation)

  // Booking / Routing states
  const [origin, setOrigin] = useState({ address: 'Buscando seu local...', coords: null })
  const [destination, setDestination] = useState({ address: '', coords: null })
  
  const [activeInput, setActiveInput] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [searchInput, setSearchInput] = useState('')
  
  const [routeParams, setRouteParams] = useState({ km: 0, total: 0 })
  const [prioritizeFavs, setPrioritizeFavs] = useState(true)

  // Flow State: IDLE -> PRICED -> SCHEDULING | SEARCHING -> ACCEPTED
  const [rideState, setRideState] = useState('IDLE')
  const [matchedDriver, setMatchedDriver] = useState(null)
  
  // UI States
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeScreen, setActiveScreen] = useState('MAIN')
  const [scheduleData, setScheduleData] = useState({ date: '', time: '' })

  const [favoriteDrivers, setFavoriteDrivers] = useState([
    { id: 1, name: 'Carlos', car: 'Chevrolet Onix', plate: 'BRA-2031', rating: '4.9', img: 'https://i.pravatar.cc/150?img=11' },
    { id: 2, name: 'Ana', car: 'Hyundai HB20', plate: 'XPT-9988', rating: '5.0', img: 'https://i.pravatar.cc/150?img=5' }
  ])

  // System get GPS on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const coords = [position.coords.latitude, position.coords.longitude]
        setMapCenter(coords)
        setOrigin({ address: 'Meu Local Atual (GPS)', coords: coords })
      }, () => {
        setOrigin({ address: 'Local Padrão', coords: defaultLocation })
      }, { enableHighAccuracy: true })
    }
  }, [])

  // Calculate pricing when both addresses are defined
  useEffect(() => {
    if (origin.coords && destination.coords && rideState === 'IDLE') {
      const dist = getDistance(origin.coords, destination.coords)
      const mockKm = dist.toFixed(1)
      const mockTotal = (parseFloat(mockKm) * 2.00).toFixed(2)
      setRouteParams({ km: mockKm, total: mockTotal })
      setRideState('PRICED')
      setIsSheetCollapsed(false) 
    }
  }, [origin.coords, destination.coords, rideState])

  const handleTyping = async (value, type) => {
    setActiveInput(type)
    setSearchInput(value)
    
    if (type === 'origin') setOrigin({ ...origin, address: value })
    if (type === 'dest') setDestination({ ...destination, address: value })

    if (value.length > 3) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&countrycodes=br&limit=5`)
        const data = await res.json()
        setSuggestions(data.map(item => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon)
        })))
      } catch (err) {
        console.error("Erro ao buscar sugestões", err)
      }
    } else {
      setSuggestions([])
    }
  }

  const selectSuggestion = (sug) => {
    const coords = [sug.lat, sug.lon]
    const shortName = sug.display_name.split(',')[0]
    
    if (activeInput === 'origin') {
      setOrigin({ address: shortName, coords: coords })
      setMapCenter(coords)
    } else {
      setDestination({ address: shortName, coords: coords })
    }
    
    setSuggestions([])
    setSearchInput('')
    setActiveInput(null)
  }

  // --- ACTIONS ---
  const handleCallNow = () => {
    setRideState('SEARCHING')
    // Simulates searching delay
    setTimeout(() => {
      // Simulate finding a driver
      const drv = prioritizeFavs && favoriteDrivers.length > 0 
        ? favoriteDrivers[0] 
        : { id: 99, name: 'Roberto', car: 'Fiat Argo', plate: 'ABC-1234', rating: '4.8', img: 'https://i.pravatar.cc/150?img=33' };
      
      setMatchedDriver({ ...drv, eta: '4 min' })
      setRideState('ACCEPTED')
    }, prioritizeFavs ? 4000 : 2000) // "Ping favorites for 15s (simulated as 4s here) vs faster regular search"
  }

  const resetFlow = () => {
    setDestination({ address: '', coords: null })
    setRideState('IDLE')
    setMatchedDriver(null)
  }

  // --- MENU RENDERER --- (Profile edit logic stays generic for now)
  const renderMenuContent = () => (
    <div className="menu-nav-list">
      <div className="menu-user-header">
         <div className="user-avatar-large">{user?.name?.charAt(0) || 'P'}</div>
         <div>
            <h3 style={{margin: 0}}>{user?.name}</h3>
            <span className="badge-nearby">Passageiro</span>
         </div>
      </div>
      <hr />
      <button className="menu-nav-btn" onClick={resetFlow}>Nova Viagem</button>
      <button className="menu-nav-btn" onClick={() => {}}>Meu Perfil</button>
      <button className="menu-nav-btn text-danger" onClick={() => { logout(); navigate('/passageiro') }}>Sair</button>
    </div>
  )

  return (
    <div className="passenger-app">
      
      <div className="passenger-map-bg interactive">
        <MapContainer center={mapCenter} zoom={16} zoomControl={false} style={{ width: '100%', height: '100%' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapController 
            center={mapCenter} 
            markers={origin.coords && destination.coords ? [origin.coords, destination.coords] : null} 
          />
          
          {/* Real Green/Red Pins logic */}
          {origin.coords && <Marker position={origin.coords} icon={originIcon} />}
          {destination.coords && <Marker position={destination.coords} icon={destIcon} />}
          
          {/* Connecting line */}
          {origin.coords && destination.coords && (
            <Polyline positions={[origin.coords, destination.coords]} color="#000000" weight={4} dashArray="8 8" opacity={0.5} />
          )}
        </MapContainer>
        
        {/* Fallback pin if no origin coords exist yet */}
        {!origin.coords && (
           <div className="absolute-center-pin-wrapper">
             <div className="center-pin modern-dynamic">
               <div className="pin-head"></div><div className="pin-shadow"></div>
             </div>
           </div>
        )}
      </div>

      <div className="passenger-top-header">
        <div className="menu-btn" onClick={() => setIsMenuOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </div>
      </div>

      {/* Main Bottom Sheet */}
      <div className={`passenger-bottom-sheet ${isSheetCollapsed ? 'collapsed' : ''}`}>
        <div className="sheet-drag-area" onClick={() => setIsSheetCollapsed(!isSheetCollapsed)}>
          <div className="sheet-handle"></div>
        </div>
        
        <div className="sheet-content-wrapper">
          
          {rideState === 'IDLE' && (
            <div className="state-idle animate-fade-in">
              <h2 className="sheet-title">Para onde vamos?</h2>

              <div className="route-inputs" style={{position: 'relative'}}>
                <div className="route-timeline">
                  <div className="dot-start"></div><div className="timeline-line"></div><div className="dot-end"></div>
                </div>
                <div className="route-fields">
                  <input 
                    type="text" className="route-input start-input" 
                    value={origin.address} onChange={(e) => handleTyping(e.target.value, 'origin')} 
                    placeholder="Local de partida" 
                  />
                  <input 
                    type="text" className="route-input end-input" 
                    value={destination.address} onChange={(e) => handleTyping(e.target.value, 'dest')} 
                    placeholder="Buscar destino..." 
                  />
                </div>
                
                {/* Autocomplete Dropdown */}
                {suggestions.length > 0 && (
                   <div className="autocomplete-dropdown">
                     {suggestions.map((sug, idx) => (
                       <div key={idx} className="suggestion-item" onClick={() => selectSuggestion(sug)}>
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                         {sug.display_name.split(',').slice(0, 2).join(',')}
                       </div>
                     ))}
                   </div>
                )}
              </div>
            </div>
          )}

          {rideState === 'PRICED' && (
            <div className="state-priced animate-fade-in-up">
              <h2 className="sheet-title" style={{marginBottom: '8px'}}>Resumo da Viagem</h2>
              <p className="route-desc">{origin.address.split(',')[0]} → {destination.address.split(',')[0]}</p>
              
              <div className="price-box">
                <div className="price-val">
                  <span className="currency">R$</span> {routeParams.total}
                </div>
                <div className="dist-val">{routeParams.km} km estimado</div>
              </div>

              <div className="prioritize-toggle">
                <div>
                  <label>Priorizar Favoritos</label>
                  <p>Toca para favoritos por 15s</p>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={prioritizeFavs} onChange={(e) => setPrioritizeFavs(e.target.checked)} />
                  <span className="slider round"></span>
                </label>
              </div>

              <div className="action-buttons mt-4">
                <button className="btn btn-schedule" onClick={() => setRideState('SCHEDULING')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Agendar
                </button>
                <button className="btn btn-primary btn-request" onClick={handleCallNow}>
                  Chamar Agora
                </button>
              </div>
            </div>
          )}

          {rideState === 'SCHEDULING' && (
            <div className="state-scheduling animate-fade-in">
              <h2 className="sheet-title">Agendar Partida</h2>
              <p className="hint-text mb-4">Escolha a data e hora. Corridas com mais de 2h de antecedência pre-acionam seus favoritos disponíveis.</p>
              
              <div className="scheduling-inputs">
                <input type="date" className="schedule-input" value={scheduleData.date} onChange={e=>setScheduleData({...scheduleData, date: e.target.value})} />
                <input type="time" className="schedule-input" value={scheduleData.time} onChange={e=>setScheduleData({...scheduleData, time: e.target.value})} />
              </div>
              
              <div className="action-buttons mt-4">
                <button className="btn btn-secondary" style={{flex: 1}} onClick={() => setRideState('PRICED')}>Voltar</button>
                <button className="btn btn-primary" style={{flex: 2}} onClick={() => { alert('Viagem Agendada com Sucesso!'); resetFlow(); }}>Confirmar Agendamento</button>
              </div>
            </div>
          )}

          {rideState === 'SEARCHING' && (
            <div className="state-searching animate-fade-in text-center">
              <div className="search-radar"></div>
              <h3 style={{marginTop: '24px'}}>{prioritizeFavs ? 'Notificando favoritos...' : 'Buscando motoristas...'}</h3>
              <p className="hint-text">Aguarde enquanto conectamos você ao melhor parceiro próximo.</p>
              <button className="btn btn-secondary mt-4 w-full" onClick={() => setRideState('PRICED')}>Cancelar Busca</button>
            </div>
          )}

          {rideState === 'ACCEPTED' && matchedDriver && (
            <div className="state-accepted animate-slide-up">
              <div className="match-header">
                <div className="badge-nearby">Motorista a Caminho</div>
                <h3>{matchedDriver.eta}</h3>
              </div>
              
              <div className="driver-card-large">
                <img src={matchedDriver.img} alt={matchedDriver.name} className="drv-avatar" />
                <div className="drv-info">
                  <h4>{matchedDriver.name}</h4>
                  <div className="drv-rating">⭐ {matchedDriver.rating}</div>
                </div>
                <div className="drv-car">
                  <span className="car-model">{matchedDriver.car}</span>
                  <span className="car-plate">{matchedDriver.plate}</span>
                </div>
              </div>
              
              <div className="action-buttons mt-4">
                <button className="btn btn-secondary" style={{flex:1}}>Mensagem</button>
                <button className="btn btn-secondary text-danger" style={{flex:1}} onClick={resetFlow}>Cancelar</button>
              </div>
            </div>
          )}

        </div>
      </div>

      {isMenuOpen && (
        <div className="side-menu-overlay" onClick={() => setIsMenuOpen(false)}>
          <div className="side-menu-drawer animate-slide-right" onClick={e => e.stopPropagation()}>
            <div className="drawer-close" onClick={() => setIsMenuOpen(false)}>
              X
            </div>
            {renderMenuContent()}
          </div>
        </div>
      )}

    </div>
  )
}
