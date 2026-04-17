import { useState, useEffect, useRef, useCallback } from 'react'
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
const originIcon = createIcon('#00E676')
const destIcon = createIcon('#EF4444')

// Helper: resolve address text to coordinates via Nominatim
async function resolveAddress(text) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&countrycodes=br&limit=1`
  )
  const data = await res.json()
  if (data && data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      name: data[0].display_name
    }
  }
  return null
}

// Helper: fetch real road route from OSRM
async function fetchOSRMRoute(originCoords, destCoords) {
  const url = `https://router.project-osrm.org/route/v1/driving/${originCoords[1]},${originCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`
  const res = await fetch(url)
  const data = await res.json()
  if (data.routes && data.routes.length > 0) {
    const route = data.routes[0]
    const km = (route.distance / 1000).toFixed(1)
    const durationMin = Math.ceil(route.duration / 60) // Convert seconds to minutes
    const geometry = route.geometry.coordinates.map(c => [c[1], c[0]])
    return { km, geometry, durationMin }
  }
  return null
}

// Map controller to auto-center/zoom
function MapController({ center, markers }) {
  const map = useMap()
  useEffect(() => {
    if (markers && markers.length === 2 && markers[0] && markers[1]) {
      const bounds = L.latLngBounds(markers)
      map.flyToBounds(bounds, { padding: [80, 80], animate: true })
    } else if (center) {
      map.flyTo(center, 16)
    }
  }, [center, markers, map])
  return null
}

export default function PassengerDashboard() {
  const navigate = useNavigate()
  const user = getCurrentUser()

  // Map
  const [mapCenter, setMapCenter] = useState([-22.9068, -43.1729])

  // Origin & Destination
  const [originAddr, setOriginAddr] = useState('Meu Local Atual (GPS)')
  const [originCoords, setOriginCoords] = useState(null)
  const [destAddr, setDestAddr] = useState('')
  const [destCoords, setDestCoords] = useState(null)

  // Keep refs for latest coords to avoid stale closures
  const originCoordsRef = useRef(null)
  const destCoordsRef = useRef(null)
  useEffect(() => { originCoordsRef.current = originCoords }, [originCoords])
  useEffect(() => { destCoordsRef.current = destCoords }, [destCoords])

  // Suggestions
  const [suggestions, setSuggestions] = useState([])
  const [sugTarget, setSugTarget] = useState(null) // 'origin' | 'dest'
  const debounceRef = useRef(null)

  // Route
  const [routeGeometry, setRouteGeometry] = useState([])
  const [routeKm, setRouteKm] = useState('0')
  const [routeDuration, setRouteDuration] = useState(0)
  const [vehicleType, setVehicleType] = useState('car') // 'car' | 'moto'

  // Pricing constants
  const PRICE_PER_KM = { car: 2.00, moto: 1.50 }
  const MIN_PRICE = { car: 8.40, moto: 7.20 }

  // Compute price based on vehicle type and distance
  const getPrice = (km, type) => {
    const calculated = parseFloat(km) * PRICE_PER_KM[type]
    const minimum = MIN_PRICE[type]
    return Math.max(calculated, minimum).toFixed(2)
  }

  // Profile data
  const [profileData, setProfileData] = useState({
    name: user?.name || 'Leandro Palmeira',
    email: user?.email || 'leandro@exemplo.com'
  })

  // State machine: IDLE -> PRICED -> SCHEDULING | SEARCHING -> ACCEPTED
  const [rideState, setRideState] = useState('IDLE')
  const [isLoading, setIsLoading] = useState(false)
  const [scheduleData, setScheduleData] = useState({ date: '', time: '' })

  // Active Ride Extra States
  const [cancelCountdown, setCancelCountdown] = useState(59)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')

  // Manage 60-second countdown when ACCEPTED
  useEffect(() => {
    let timer;
    if (rideState === 'ACCEPTED' && cancelCountdown > 0) {
      timer = setInterval(() => {
        setCancelCountdown(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [rideState, cancelCountdown])

  // UI
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuScreen, setMenuScreen] = useState('MAIN') // 'MAIN' | 'SCHEDULED'
  const [expandedRide, setExpandedRide] = useState(null) // id of expanded ride
  const [prioritizeFavs, setPrioritizeFavs] = useState(true)

  // Scheduled rides list
  const [scheduledRides, setScheduledRides] = useState(() => {
    try {
      const saved = localStorage.getItem('zomp_scheduled_rides')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  // Persist scheduled rides to localStorage
  useEffect(() => {
    localStorage.setItem('zomp_scheduled_rides', JSON.stringify(scheduledRides))
  }, [scheduledRides])

  // Favorite drivers state
  const [favoriteDriversState, setFavoriteDriversState] = useState([
    { id: 1, name: 'Carlos Santos', car: 'Chevrolet Onix', plate: 'BRA-2031', rating: '4.9', img: 'https://i.pravatar.cc/150?img=11' },
    { id: 2, name: 'Ana Silva', car: 'Hyundai HB20', plate: 'XPT-9988', rating: '5.0', img: 'https://i.pravatar.cc/150?img=5' }
  ])

  // History state
  const [rideHistory, setRideHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('zomp_ride_history')
      if (saved) return JSON.parse(saved)
    } catch { /* empty */ }
    return [
      { id: 101, date: '16/04/2026', origin: 'Rua São José, Centro', dest: 'Botafogo Praia Shopping', price: '24.50', vehicle: 'Carro', status: 'COMPLETED' },
      { id: 102, date: '14/04/2026', origin: 'Av. Paulista, 1000', dest: 'Aeroporto Congonhas', price: '45.00', vehicle: 'Carro', status: 'COMPLETED' },
      { id: 103, date: '10/04/2026', origin: 'Terminal Madureira', dest: 'Rua Dona Clara 35', price: '12.00', vehicle: 'Moto', status: 'COMPLETED' }
    ]
  })

  // Persist history to localStorage
  useEffect(() => {
    localStorage.setItem('zomp_ride_history', JSON.stringify(rideHistory))
  }, [rideHistory])

  // ============= GPS on load =============
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = [pos.coords.latitude, pos.coords.longitude]
          setMapCenter(c)
          setOriginCoords(c)
          setOriginAddr('Meu Local Atual (GPS)')
        },
        () => {
          // Fallback
          setOriginCoords([-22.9068, -43.1729])
          setOriginAddr('Rio de Janeiro, RJ')
        },
        { enableHighAccuracy: true }
      )
    }
  }, [])

  // ============= Address search with debounce =============
  const searchAddress = useCallback((text, target) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSugTarget(target)

    if (text.length < 4) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&countrycodes=br&limit=5`
        )
        const data = await res.json()
        setSuggestions(data || [])
      } catch (e) {
        console.error('Nominatim search error:', e)
      }
    }, 600) // 600ms debounce to respect API rate limits
  }, [])

  // ============= Select suggestion =============
  const handleSelectSuggestion = async (s) => {
    const coords = [parseFloat(s.lat), parseFloat(s.lon)]

    // Extract house number from what user typed
    const typedText = sugTarget === 'origin' ? originAddr : destAddr
    const numberMatch = typedText.match(/\d+/)
    const houseNumber = numberMatch ? numberMatch[0] : ''

    // Build address: street name + number + bairro + cidade
    const parts = s.display_name.split(',')
    const streetName = parts[0]?.trim() || ''
    const bairro = parts.length > 2 ? parts[parts.length - 4]?.trim() || parts[1]?.trim() : parts[1]?.trim() || ''
    const cidade = parts.length > 3 ? parts[parts.length - 3]?.trim() || '' : ''
    const shortAddr = houseNumber
      ? `${streetName} ${houseNumber}, ${bairro}${cidade ? ', ' + cidade : ''}`
      : `${streetName}, ${bairro}${cidade ? ', ' + cidade : ''}`

    if (sugTarget === 'origin') {
      setOriginAddr(shortAddr)
      setOriginCoords(coords)
      setMapCenter(coords)
    } else {
      setDestAddr(shortAddr)
      setDestCoords(coords)
    }

    setSuggestions([])

    // Try to calculate route immediately if both coords are ready
    const oCoords = sugTarget === 'origin' ? coords : originCoordsRef.current
    const dCoords = sugTarget === 'dest' ? coords : destCoordsRef.current

    if (oCoords && dCoords) {
      await calculateRoute(oCoords, dCoords)
    }
  }

  // ============= Calculate route (core function) =============
  const calculateRoute = async (oCoords, dCoords) => {
    setIsLoading(true)
    try {
      const result = await fetchOSRMRoute(oCoords, dCoords)
      if (result) {
        setRouteGeometry(result.geometry)
        setRouteKm(result.km)
        setRouteDuration(result.durationMin)
        setRideState('PRICED')
        setIsSheetCollapsed(false)
      } else {
        alert('Não foi possível calcular a rota. Tente endereços mais específicos.')
      }
    } catch (e) {
      console.error('Route calculation error:', e)
      alert('Erro ao calcular rota. Verifique sua conexão.')
    } finally {
      setIsLoading(false)
    }
  }

  // ============= Force calculate (button click) =============
  const handleForceCalculate = async () => {
    setIsLoading(true)
    try {
      // Resolve origin if no coords
      let oCoords = originCoords
      if (!oCoords) {
        const resolved = await resolveAddress(originAddr)
        if (resolved) {
          oCoords = [resolved.lat, resolved.lon]
          setOriginCoords(oCoords)
          setMapCenter(oCoords)
        }
      }

      // Resolve destination if no coords
      let dCoords = destCoords
      if (!dCoords) {
        const resolved = await resolveAddress(destAddr)
        if (resolved) {
          dCoords = [resolved.lat, resolved.lon]
          setDestCoords(dCoords)
        }
      }

      if (oCoords && dCoords) {
        await calculateRoute(oCoords, dCoords)
      } else {
        alert('Não foi possível encontrar os endereços. Tente ser mais específico (ex: "Rua Toriba 113, Madureira, Rio de Janeiro")')
      }
    } catch (e) {
      console.error('Force calculate error:', e)
    } finally {
      setIsLoading(false)
    }
  }

  // ============= Call now =============
  const handleCallNow = () => {
    setRideState('SEARCHING')
    const delay = prioritizeFavs ? 4000 : 2000
    setTimeout(() => {
      setRideState('ACCEPTED')
      setCancelCountdown(59) // Starts the cancel grace period
    }, delay)
  }

  // ============= Reset =============
  const resetFlow = () => {
    setDestAddr('')
    setDestCoords(null)
    setRouteGeometry([])
    setRouteKm('0')
    setVehicleType('car')
    setScheduleData({ date: '', time: '' })
    setRideState('IDLE')
    setIsSheetCollapsed(false)
    setCancelCountdown(59)
    setIsChatOpen(false)
    setChatMessages([])
  }

  // ============= Markers for map =============
  const allMarkers = originCoords && destCoords ? [originCoords, destCoords] : null

  return (
    <div className="passenger-app">

      {/* ===== MAP ===== */}
      <div className="passenger-map-bg">
        <MapContainer center={mapCenter} zoom={16} zoomControl={false} style={{width:'100%', height:'100%'}}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapController center={mapCenter} markers={allMarkers} />
          {originCoords && <Marker position={originCoords} icon={originIcon} />}
          {destCoords && <Marker position={destCoords} icon={destIcon} />}
          {routeGeometry.length > 0 && (
            <Polyline positions={routeGeometry} color="#1a1a2e" weight={5} opacity={0.85} />
          )}
        </MapContainer>
      </div>

      {/* ===== TOP HEADER ===== */}
      <div className="passenger-top-header">
        <div className="menu-btn" onClick={() => setIsMenuOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </div>
      </div>

      {/* ===== BOTTOM SHEET ===== */}
      <div className={`passenger-bottom-sheet ${isSheetCollapsed ? 'collapsed' : ''}`}>
        <div className="sheet-drag-area" onClick={() => setIsSheetCollapsed(!isSheetCollapsed)}>
          <div className="sheet-handle"></div>
        </div>

        <div className="sheet-content-wrapper">

          {/* ---- STATE: IDLE ---- */}
          {rideState === 'IDLE' && (
            <div className="state-idle animate-fade-in">
              <h2 className="sheet-title">Para onde vamos?</h2>

              <div className="route-inputs">
                <div className="route-timeline">
                  <div className="dot-start"></div>
                  <div className="timeline-line"></div>
                  <div className="dot-end"></div>
                </div>
                <div className="route-fields">
                  <input
                    className="route-input start-input"
                    value={originAddr}
                    onChange={(e) => {
                      const v = e.target.value
                      setOriginAddr(v)
                      setOriginCoords(null)
                      searchAddress(v, 'origin')
                    }}
                    placeholder="Local de partida"
                  />
                  <input
                    className="route-input end-input"
                    value={destAddr}
                    onChange={(e) => {
                      const v = e.target.value
                      setDestAddr(v)
                      setDestCoords(null)
                      searchAddress(v, 'dest')
                    }}
                    placeholder="Para onde vai?"
                  />
                </div>

                {/* Suggestions dropdown */}
                {suggestions.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {suggestions.map((s, i) => (
                      <div key={i} className="suggestion-item" onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s) }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>{s.display_name.split(',').slice(0, 3).join(',')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Force calculate button */}
              <button
                className="btn btn-primary"
                style={{width:'100%', marginTop:'16px', padding:'16px', fontWeight:700, fontSize:'1rem'}}
                onClick={handleForceCalculate}
                disabled={isLoading || destAddr.length < 4}
              >
                {isLoading ? '⏳ Calculando rota...' : '🚗 VER PREÇO E ROTA'}
              </button>

              {/* Favorites */}
              <div className="favorites-section" style={{marginTop:'20px'}}>
                <div className="section-header">
                  <h3>Motoristas Favoritos</h3>
                  <span className="badge-nearby">PRIORIDADE</span>
                </div>
                {favoriteDriversState.length === 0 ? (
                  <p className="hint-text" style={{marginTop: '8px'}}>Nenhum motorista favorito no momento.</p>
                ) : (
                  <div className="favorites-scroll">
                    {favoriteDriversState.map(d => (
                      <div key={d.id} className="fav-driver-card">
                        <img src={d.img} className="fav-img" alt={d.name} />
                        <div className="fav-info">
                          <span className="fav-name">{d.name.split(' ')[0]}</span>
                          <span className="fav-dist">Até 10min</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="hint-text">Serão notificados primeiro para sua corrida.</p>
              </div>
            </div>
          )}

          {/* ---- STATE: PRICED ---- */}
          {rideState === 'PRICED' && (
            <div className="state-priced animate-fade-in-up">
              <h2 className="sheet-title" style={{marginBottom:'8px'}}>Resumo da Viagem</h2>
              <p className="route-desc">{originAddr} → {destAddr}</p>

              {/* Vehicle Type Selector */}
              <div className="vehicle-selector">
                <div
                  className={`vehicle-option ${vehicleType === 'car' ? 'active' : ''}`}
                  onClick={() => setVehicleType('car')}
                >
                  <span className="vehicle-icon">🚗</span>
                  <div className="vehicle-details">
                    <span className="vehicle-name">Carro</span>
                    <span className="vehicle-price">R$ {getPrice(routeKm, 'car')}</span>
                  </div>
                  <span className="vehicle-info">Conforto</span>
                </div>
                <div
                  className={`vehicle-option ${vehicleType === 'moto' ? 'active' : ''}`}
                  onClick={() => setVehicleType('moto')}
                >
                  <span className="vehicle-icon">🏍️</span>
                  <div className="vehicle-details">
                    <span className="vehicle-name">Moto</span>
                    <span className="vehicle-price">R$ {getPrice(routeKm, 'moto')}</span>
                  </div>
                  <span className="vehicle-info">Econômico</span>
                </div>
              </div>

              <div className="price-box">
                <div className="price-val">
                  <span className="currency">R$</span> {getPrice(routeKm, vehicleType)}
                </div>
                <div className="dist-val">{routeKm} km estimado</div>
              </div>

              {parseFloat(routeKm) * PRICE_PER_KM[vehicleType] < MIN_PRICE[vehicleType] && (
                <p className="hint-text" style={{marginBottom:'12px', color:'#f59e0b'}}>
                  ⚠️ Tarifa mínima aplicada ({vehicleType === 'car' ? 'Carro: R$ 8,40' : 'Moto: R$ 7,20'})
                </p>
              )}

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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {' '}Agendar
                </button>
                <button className="btn btn-primary btn-request" onClick={handleCallNow}>
                  Chamar Agora
                </button>
              </div>

              <button
                className="btn btn-secondary"
                style={{width:'100%', marginTop:'12px'}}
                onClick={resetFlow}
              >
                ← Alterar endereços
              </button>
            </div>
          )}

          {/* ---- STATE: SCHEDULING ---- */}
          {rideState === 'SCHEDULING' && (
            <div className="state-scheduling animate-fade-in">
              <h2 className="sheet-title">Agendar Partida</h2>
              <p className="route-desc">{originAddr} → {destAddr}</p>

              <div className="vehicle-selector" style={{marginBottom:'16px'}}>
                <div className={`vehicle-option ${vehicleType === 'car' ? 'active' : ''}`} onClick={() => setVehicleType('car')}>
                  <span className="vehicle-icon">🚗</span>
                  <div className="vehicle-details"><span className="vehicle-name">Carro</span><span className="vehicle-price">R$ {getPrice(routeKm, 'car')}</span></div>
                </div>
                <div className={`vehicle-option ${vehicleType === 'moto' ? 'active' : ''}`} onClick={() => setVehicleType('moto')}>
                  <span className="vehicle-icon">🏍️</span>
                  <div className="vehicle-details"><span className="vehicle-name">Moto</span><span className="vehicle-price">R$ {getPrice(routeKm, 'moto')}</span></div>
                </div>
              </div>

              <p className="hint-text" style={{marginBottom:'16px'}}>Escolha a data e hora da partida. Corridas com +2h de antecedência pré-acionam seus favoritos.</p>

              <div className="scheduling-inputs">
                <input
                  type="date"
                  className="schedule-input"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData({...scheduleData, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
                <input
                  type="time"
                  className="schedule-input"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData({...scheduleData, time: e.target.value})}
                />
              </div>

              <div className="price-box" style={{marginTop:'16px'}}>
                <div className="price-val">
                  <span className="currency">R$</span> {getPrice(routeKm, vehicleType)}
                </div>
                <div className="dist-val">{routeKm} km • {vehicleType === 'car' ? 'Carro' : 'Moto'}</div>
              </div>

              <div className="action-buttons mt-4">
                <button className="btn btn-secondary" style={{flex:1}} onClick={() => setRideState('PRICED')}>
                  ← Voltar
                </button>
                <button
                  className="btn btn-primary"
                  style={{flex:2}}
                  disabled={!scheduleData.date || !scheduleData.time}
                  onClick={() => {
                    const newRide = {
                      id: Date.now(),
                      origin: originAddr,
                      dest: destAddr,
                      date: scheduleData.date,
                      time: scheduleData.time,
                      vehicle: vehicleType,
                      price: getPrice(routeKm, vehicleType),
                      km: routeKm
                    }
                    setScheduledRides(prev => [...prev, newRide])
                    alert(`✅ Viagem agendada com sucesso!\n\n📅 ${scheduleData.date} às ${scheduleData.time}\n${vehicleType === 'car' ? '🚗 Carro' : '🏍️ Moto'} — R$ ${getPrice(routeKm, vehicleType)}`)
                    resetFlow()
                  }}
                >
                  Confirmar Agendamento
                </button>
              </div>
            </div>
          )}

          {/* ---- STATE: SEARCHING ---- */}
          {rideState === 'SEARCHING' && (
            <div className="state-searching animate-fade-in text-center">
              <div className="search-radar"></div>
              <h3 style={{marginTop:'24px'}}>
                {prioritizeFavs ? 'Notificando favoritos...' : 'Buscando motoristas...'}
              </h3>
              <p className="hint-text">Aguarde enquanto conectamos você ao melhor parceiro próximo.</p>
              <button className="btn btn-secondary mt-4 w-full" onClick={() => setRideState('PRICED')}>
                Cancelar Busca
              </button>
            </div>
          )}

          {/* ---- STATE: ACCEPTED ---- */}
          {rideState === 'ACCEPTED' && favoriteDriversState.length > 0 && (
            <div className="state-accepted animate-fade-in-up">
              <div className="match-header">
                <span className="badge-nearby">MOTORISTA A CAMINHO</span>
                <h3>4 min</h3>
              </div>
              <div className="driver-card-large" style={{marginBottom: '12px'}}>
                <img src={favoriteDriversState[0].img} alt={favoriteDriversState[0].name} className="drv-avatar" />
                <div className="drv-info">
                  <h4>{favoriteDriversState[0].name}</h4>
                  <div className="drv-rating">⭐ {favoriteDriversState[0].rating}</div>
                </div>
                <div className="drv-car">
                  <span className="car-model">{favoriteDriversState[0].car}</span>
                  <span className="car-plate">{favoriteDriversState[0].plate}</span>
                </div>
              </div>

              {routeDuration > 0 && (
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0', 
                  borderRadius: '12px', padding: '12px', marginBottom: '16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '1.2rem'}}>📍</span>
                    <div>
                      <div style={{fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Chegada ao destino em</div>
                      <div style={{fontWeight: 800, color: '#065f46'}}>Aprox. {routeDuration} min</div>
                    </div>
                  </div>
                  <div style={{fontWeight: 800, fontSize: '1.1rem', color: '#166534'}}>
                    ~ {routeKm} km
                  </div>
                </div>
              )}

              <div className="action-buttons mt-4">
                <button 
                  className="btn btn-secondary" 
                  style={{flex:1}}
                  onClick={() => setIsChatOpen(true)}
                >
                  💬 Mensagem
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{flex:1, color:'#ef4444', display:'flex', flexDirection:'column', alignItems:'center', gap:'2px'}} 
                  onClick={() => {
                    const d = new Date()
                    const today = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
                    
                    if (cancelCountdown > 0) {
                      if (confirm('Deseja realmente cancelar gratuitamente a corrida?')) {
                        setRideHistory(prev => [{ id: Date.now(), date: today, origin: originAddr, dest: destAddr, price: '0.00', vehicle: vehicleType === 'car' ? 'Carro' : 'Moto', status: 'CANCELED_FREE' }, ...prev])
                        resetFlow()
                      }
                    } else {
                      if (confirm('O período de cancelamento grátis expirou. Uma taxa de deslocamento será cobrada na sua próxima corrida. Deseja cancelar mesmo assim?')) {
                        setRideHistory(prev => [{ id: Date.now(), date: today, origin: originAddr, dest: destAddr, price: '3.40', vehicle: vehicleType === 'car' ? 'Carro' : 'Moto', status: 'CANCELED_FEE' }, ...prev])
                        resetFlow()
                      }
                    }
                  }}
                >
                  <span style={{fontWeight: 800}}>Cancelar</span>
                  {cancelCountdown > 0 ? (
                    <span style={{fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700}}>Grátis (0:{cancelCountdown.toString().padStart(2, '0')})</span>
                  ) : (
                    <span style={{fontSize: '0.7rem', color: '#ef4444', fontWeight: 700}}>Taxa Aplicável</span>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ===== SIDE MENU ===== */}
      {isMenuOpen && (
        <div className="side-menu-overlay" onClick={() => { setIsMenuOpen(false); setMenuScreen('MAIN') }}>
          <div className="side-menu-drawer animate-slide-right" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-close" onClick={() => { setIsMenuOpen(false); setMenuScreen('MAIN') }}>✕</div>
            <div className="menu-nav-list">

              {menuScreen === 'MAIN' && (
                <>
                  <div className="menu-user-header">
                    <div className="user-avatar-large">{user?.name?.charAt(0) || 'P'}</div>
                    <div>
                      <h3 style={{margin:0}}>{user?.name || 'Passageiro'}</h3>
                      <span className="badge-nearby">Passageiro</span>
                    </div>
                  </div>
                  <hr />
                  <button className="menu-nav-btn" onClick={() => { resetFlow(); setIsMenuOpen(false) }}>Nova Viagem</button>
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('SCHEDULED')}>
                    📅 Corridas Agendadas
                    {scheduledRides.length > 0 && (
                      <span style={{
                        marginLeft: '8px',
                        background: 'var(--primary)',
                        color: '#000',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}>{scheduledRides.length}</span>
                    )}
                  </button>
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('PROFILE')}>👤 Meu Perfil</button>
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('HISTORY')}>🕒 Histórico</button>
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('FAVORITES')}>⭐ Favoritos</button>
                  <div className="menu-spacer"></div>
                  <button className="menu-nav-btn text-danger" onClick={() => { logout(); navigate('/passageiro') }}>
                    Sair do App
                  </button>
                </>
              )}

              {menuScreen === 'SCHEDULED' && (
                <>
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('MAIN')} style={{color: 'var(--primary)', marginBottom: '4px'}}>
                    ← Voltar ao Menu
                  </button>
                  <h3 style={{fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px'}}>Corridas Agendadas</h3>
                  <p className="hint-text" style={{marginBottom: '16px'}}>Toque em uma corrida para ver os detalhes</p>

                  {scheduledRides.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px 0'}}>
                      <div style={{fontSize: '3.5rem', marginBottom: '16px'}}>📋</div>
                      <p style={{color: '#3f3f46', fontWeight: 700, fontSize: '1.05rem'}}>Nenhuma corrida agendada</p>
                      <p className="hint-text" style={{marginTop: '8px'}}>Agende uma viagem para vê-la aqui.</p>
                    </div>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
                      {scheduledRides.map((ride) => {
                        // Format date to Brazilian (DD/MM/YYYY)
                        const dateParts = ride.date.split('-')
                        const dateBR = dateParts.length === 3
                          ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
                          : ride.date

                        // Simulated driver acceptance (after 30min from creation)
                        const isAccepted = (Date.now() - ride.id) > 1800000
                        const acceptedDriver = isAccepted ? favoriteDriversState[0] : null

                        return (
                          <div
                            key={ride.id}
                            className="scheduled-ride-card"
                            onClick={() => setExpandedRide(expandedRide === ride.id ? null : ride.id)}
                          >
                            {/* Card Header */}
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <div style={{
                                  fontSize: '1.8rem',
                                  width: '48px', height: '48px',
                                  background: ride.vehicle === 'car' ? '#ecfdf5' : '#fef3c7',
                                  borderRadius: '14px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                  {ride.vehicle === 'car' ? '🚗' : '🏍️'}
                                </div>
                                <div>
                                  <div style={{fontWeight: 800, fontSize: '1rem', color: 'var(--text-dark)'}}>
                                    {dateBR} às {ride.time}
                                  </div>
                                  <div style={{fontWeight: 700, fontSize: '1.1rem', color: '#065f46'}}>
                                    R$ {ride.price}
                                  </div>
                                </div>
                              </div>
                              <div style={{textAlign: 'right'}}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  background: isAccepted ? '#dcfce7' : '#fef9c3',
                                  color: isAccepted ? '#166534' : '#854d0e'
                                }}>
                                  {isAccepted ? '✓ Confirmada' : '⏳ Aguardando'}
                                </span>
                                <div style={{fontSize: '0.75rem', color: '#a1a1aa', marginTop: '4px', fontWeight: 600}}>
                                  {ride.vehicle === 'car' ? 'Carro' : 'Moto'} • {ride.km} km
                                </div>
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedRide === ride.id && (
                              <div style={{marginTop: '14px', borderTop: '1px solid #e4e4e7', paddingTop: '14px'}}>
                                {/* Route */}
                                <div style={{marginBottom: '14px'}}>
                                  <div style={{fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px'}}>Trajeto</div>
                                  <div style={{display: 'flex', gap: '10px', alignItems: 'flex-start'}}>
                                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2px'}}>
                                      <div style={{width: '8px', height: '8px', borderRadius: '50%', background: '#00E676'}}></div>
                                      <div style={{width: '2px', height: '20px', background: '#d4d4d8'}}></div>
                                      <div style={{width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444'}}></div>
                                    </div>
                                    <div>
                                      <div style={{fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '8px'}}>
                                        {ride.origin}
                                      </div>
                                      <div style={{fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)'}}>
                                        {ride.dest}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Driver Info */}
                                {isAccepted && acceptedDriver && (
                                  <div style={{marginBottom: '14px'}}>
                                    <div style={{fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px'}}>Motorista Confirmado</div>
                                    <div style={{
                                      display: 'flex', alignItems: 'center', gap: '12px',
                                      background: '#f0fdf4', padding: '12px', borderRadius: '12px', border: '1px solid #bbf7d0'
                                    }}>
                                      <img src={acceptedDriver.img} alt={acceptedDriver.name} style={{width:'44px', height:'44px', borderRadius:'50%', objectFit:'cover', border:'2px solid #fff'}} />
                                      <div style={{flex: 1}}>
                                        <div style={{fontWeight: 800, fontSize: '0.95rem'}}>{acceptedDriver.name}</div>
                                        <div style={{fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b'}}>⭐ {acceptedDriver.rating}</div>
                                      </div>
                                      <div style={{textAlign: 'right'}}>
                                        <div style={{fontWeight: 700, fontSize: '0.8rem'}}>{acceptedDriver.car}</div>
                                        <div style={{
                                          fontSize: '0.75rem', fontWeight: 700,
                                          background: '#e4e4e7', padding: '2px 8px', borderRadius: '4px',
                                          marginTop: '2px', fontFamily: 'monospace'
                                        }}>{acceptedDriver.plate}</div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {!isAccepted && (
                                  <div style={{
                                    background: '#fefce8', border: '1px solid #fde68a',
                                    borderRadius: '12px', padding: '12px', marginBottom: '14px',
                                    display: 'flex', alignItems: 'center', gap: '10px'
                                  }}>
                                    <span style={{fontSize: '1.3rem'}}>⏳</span>
                                    <div>
                                      <div style={{fontWeight: 700, fontSize: '0.85rem', color: '#92400e'}}>Aguardando motorista</div>
                                      <div style={{fontSize: '0.75rem', color: '#a16207'}}>Notificaremos quando alguém aceitar sua corrida.</div>
                                    </div>
                                  </div>
                                )}

                                {/* Cancel Button */}
                                <button
                                  className="btn btn-secondary"
                                  style={{
                                    width: '100%', padding: '12px',
                                    fontSize: '0.85rem', color: '#ef4444',
                                    fontWeight: 700, borderColor: '#fecaca'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (confirm('Deseja cancelar esta corrida agendada?')) {
                                      setScheduledRides(prev => prev.filter(r => r.id !== ride.id))
                                    }
                                  }}
                                >
                                  ✕ Cancelar Agendamento
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {menuScreen === 'PROFILE' && (
                <div className="animate-fade-in">
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('MAIN')} style={{color: 'var(--primary)', marginBottom: '4px'}}>
                    ← Voltar
                  </button>
                  <h3 style={{fontSize: '1.3rem', fontWeight: 800, marginBottom: '24px'}}>Meu Perfil</h3>
                  
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px'}}>
                    <div style={{width: '90px', height: '90px', borderRadius: '50%', background: 'var(--primary)', color: '#000', fontSize: '2.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px'}}>
                      {profileData.name.charAt(0)}
                    </div>
                  </div>

                  <div style={{marginBottom: '16px'}}>
                    <label style={{display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px'}}>Nome Completo</label>
                    <input 
                      type="text" 
                      className="route-input" 
                      style={{background: '#f4f4f5', padding: '12px', borderRadius: '8px', border: '1px solid #e4e4e7'}}
                      value={profileData.name} 
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})} 
                    />
                  </div>

                  <div style={{marginBottom: '24px'}}>
                    <label style={{display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px'}}>E-mail</label>
                    <input 
                      type="email" 
                      className="route-input" 
                      style={{background: '#f4f4f5', padding: '12px', borderRadius: '8px', border: '1px solid #e4e4e7'}}
                      value={profileData.email} 
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})} 
                    />
                  </div>

                  <button className="btn btn-primary" style={{width: '100%'}} onClick={() => {
                    alert('Perfil atualizado localmente com sucesso!')
                    setMenuScreen('MAIN')
                  }}>
                    Salvar Alterações
                  </button>
                </div>
              )}

              {menuScreen === 'HISTORY' && (
                <div className="animate-fade-in">
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('MAIN')} style={{color: 'var(--primary)', marginBottom: '4px'}}>
                    ← Voltar
                  </button>
                  <h3 style={{fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px'}}>Histórico de Corridas</h3>
                  
                  {rideHistory.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '32px 0'}}>
                      <p style={{color: '#71717a', fontWeight: 600}}>Nenhum histórico encontrado.</p>
                    </div>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                      {rideHistory.map(ride => (
                        <div key={ride.id} className="scheduled-ride-card" style={{cursor: 'default', opacity: (ride.status === 'CANCELED_FEE' || ride.status === 'CANCELED_FREE') ? 0.75 : 1}}>
                          
                          {ride.status === 'CANCELED_FEE' && (
                            <div style={{background: '#fef2f2', color: '#b91c1c', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '12px', border: '1px solid #fecaca'}}>
                              ⚠️ Cancelada (Taxa de deslocamento de R$ 3,40 a ser cobrada na próxima corrida)
                            </div>
                          )}
                          {ride.status === 'CANCELED_FREE' && (
                            <div style={{background: '#f4f4f5', color: '#52525b', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '12px', border: '1px solid #e4e4e7'}}>
                              ✕ Cancelada gratuitamente
                            </div>
                          )}

                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                            <div style={{fontWeight: 800}}>📅 {ride.date}</div>
                            <div style={{
                              fontWeight: 800, 
                              color: ride.status === 'CANCELED_FEE' ? '#b91c1c' : (ride.status === 'CANCELED_FREE' ? '#a1a1aa' : '#065f46')
                            }}>
                              R$ {ride.price}
                            </div>
                          </div>
                          <div style={{fontSize: '0.85rem', color: '#71717a', marginBottom: '4px'}}>📍 <b>De:</b> {ride.origin}</div>
                          <div style={{fontSize: '0.85rem', color: '#71717a'}}>🏁 <b>Para:</b> {ride.dest}</div>
                          <div style={{marginTop: '12px', display: 'inline-block', padding: '4px 8px', background: '#e4e4e7', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'}}>
                            {ride.vehicle}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {menuScreen === 'FAVORITES' && (
                <div className="animate-fade-in">
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('MAIN')} style={{color: 'var(--primary)', marginBottom: '4px'}}>
                    ← Voltar
                  </button>
                  <h3 style={{fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px'}}>Motoristas Favoritos</h3>
                  <p className="hint-text" style={{marginBottom: '20px'}}>Sua lista de motoristas indicados e selecionados como favoritos.</p>
                  
                  {favoriteDriversState.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '32px 0'}}>
                      <p style={{fontSize: '3rem', marginBottom: '12px'}}>⭐</p>
                      <p style={{color: '#71717a', fontWeight: 600}}>Você não tem favoritos</p>
                    </div>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                      {favoriteDriversState.map(driver => (
                        <div key={driver.id} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f8fafc', border: '1px solid #e4e4e7', borderRadius: '12px'}}>
                          <img src={driver.img} alt={driver.name} style={{width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover'}} />
                          <div style={{flex: 1}}>
                            <div style={{fontWeight: 800, color: 'var(--text-dark)'}}>{driver.name}</div>
                            <div style={{fontSize: '0.85rem', color: '#f59e0b', fontWeight: 700}}>⭐ {driver.rating}</div>
                            <div style={{fontSize: '0.8rem', color: '#71717a', marginTop: '2px'}}>{driver.car}</div>
                          </div>
                          <button 
                            className="btn btn-secondary" 
                            style={{padding: '8px', fontSize: '0.85rem', color: '#ef4444', borderColor: '#fecaca', background: '#fef2f2'}}
                            onClick={() => {
                              if (confirm(`Tem clareza em remover ${driver.name} dos seus favoritos?`)) {
                                setFavoriteDriversState(prev => prev.filter(d => d.id !== driver.id))
                              }
                            }}
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ===== CHAT OVERLAY ===== */}
      {isChatOpen && (
        <div className="side-menu-overlay" style={{zIndex: 9999}}>
          <div className="side-menu-drawer animate-slide-up" style={{
            width: '100%', 
            height: '85vh', 
            top: 'auto', 
            bottom: 0, 
            borderRadius: '24px 24px 0 0',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{padding: '16px 20px', borderBottom: '1px solid #e4e4e7', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <img src={favoriteDriversState[0].img} style={{width:'40px', height:'40px', borderRadius:'50%'}} alt="" />
                <div>
                  <h4 style={{margin:0, fontSize:'1rem'}}>{favoriteDriversState[0].name}</h4>
                  <span style={{fontSize:'0.8rem', color:'#059669', fontWeight:700}}>Online</span>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'#a1a1aa'}}>✕</button>
            </div>
            
            <div style={{flex: 1, padding: '20px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px'}}>
              <div style={{textAlign: 'center', fontSize: '0.8rem', color: '#a1a1aa', margin: '10px 0'}}>As mensagens são monitoradas por segurança</div>
              {chatMessages.map(msg => (
                <div key={msg.id} style={{
                  alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                  background: msg.sender === 'me' ? 'var(--primary)' : '#e4e4e7',
                  color: msg.sender === 'me' ? '#000' : '#18181b',
                  padding: '10px 16px',
                  borderRadius: msg.sender === 'me' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  maxWidth: '80%',
                  fontWeight: 600,
                  fontSize: '0.95rem'
                }}>
                  {msg.text}
                </div>
              ))}
            </div>

            <div style={{padding: '16px', borderTop: '1px solid #e4e4e7', background: '#fff', display: 'flex', gap: '10px'}}>
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Envie uma mensagem..."
                onKeyDown={(e) => {
                  if(e.key === 'Enter' && chatInput.trim()) {
                    const newMsg = {id: Date.now(), sender: 'me', text: chatInput.trim()}
                    setChatMessages(prev => [...prev, newMsg])
                    setChatInput('')

                    // Auto-reply mock
                    setTimeout(() => {
                      setChatMessages(prev => [...prev, {id: Date.now()+1, sender: 'driver', text: 'Entendido, já estou a caminho!'}])
                    }, 2000)
                  }
                }}
                style={{
                  flex: 1, padding: '14px 16px', borderRadius: '100px', 
                  border: '1px solid #d4d4d8', background: '#f4f4f5', 
                  outline: 'none', fontWeight: 600, fontSize: '0.95rem'
                }} 
              />
              <button 
                disabled={!chatInput.trim()}
                onClick={() => {
                  const newMsg = {id: Date.now(), sender: 'me', text: chatInput.trim()}
                  setChatMessages(prev => [...prev, newMsg])
                  setChatInput('')

                  setTimeout(() => {
                    setChatMessages(prev => [...prev, {id: Date.now()+1, sender: 'driver', text: 'Tudo bem! Estou chegando.'}])
                  }, 2000)
                }}
                style={{
                  background: chatInput.trim() ? '#18181b' : '#a1a1aa', color: '#fff', 
                  border: 'none', borderRadius: '50%', width: '48px', height: '48px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s'
                }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
