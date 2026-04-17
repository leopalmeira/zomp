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
    const geometry = route.geometry.coordinates.map(c => [c[1], c[0]])
    return { km, geometry }
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
  const [routePrice, setRoutePrice] = useState('0.00')

  // State machine: IDLE -> PRICED -> SEARCHING -> ACCEPTED
  const [rideState, setRideState] = useState('IDLE')
  const [isLoading, setIsLoading] = useState(false)

  // UI
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [prioritizeFavs, setPrioritizeFavs] = useState(true)

  // Favorite drivers (mock)
  const favoriteDrivers = [
    { id: 1, name: 'Carlos', car: 'Chevrolet Onix', plate: 'BRA-2031', rating: '4.9', img: 'https://i.pravatar.cc/150?img=11' },
    { id: 2, name: 'Ana', car: 'Hyundai HB20', plate: 'XPT-9988', rating: '5.0', img: 'https://i.pravatar.cc/150?img=5' }
  ]

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
        setRoutePrice((parseFloat(result.km) * 2.00).toFixed(2))
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
    }, delay)
  }

  // ============= Reset =============
  const resetFlow = () => {
    setDestAddr('')
    setDestCoords(null)
    setRouteGeometry([])
    setRouteKm('0')
    setRoutePrice('0.00')
    setRideState('IDLE')
    setIsSheetCollapsed(false)
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
                <div className="favorites-scroll">
                  {favoriteDrivers.map(d => (
                    <div key={d.id} className="fav-driver-card">
                      <img src={d.img} className="fav-img" alt={d.name} />
                      <div className="fav-info">
                        <span className="fav-name">{d.name}</span>
                        <span className="fav-dist">Até 10min</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="hint-text">Serão notificados primeiro para sua corrida.</p>
              </div>
            </div>
          )}

          {/* ---- STATE: PRICED ---- */}
          {rideState === 'PRICED' && (
            <div className="state-priced animate-fade-in-up">
              <h2 className="sheet-title" style={{marginBottom:'8px'}}>Resumo da Viagem</h2>
              <p className="route-desc">{originAddr} → {destAddr}</p>

              <div className="price-box">
                <div className="price-val">
                  <span className="currency">R$</span> {routePrice}
                </div>
                <div className="dist-val">{routeKm} km estimado</div>
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
                <button className="btn btn-schedule" onClick={() => alert('Agendamento em breve!')}>
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
          {rideState === 'ACCEPTED' && (
            <div className="state-accepted animate-fade-in-up">
              <div className="match-header">
                <span className="badge-nearby">MOTORISTA A CAMINHO</span>
                <h3>4 min</h3>
              </div>
              <div className="driver-card-large">
                <img src={favoriteDrivers[0].img} alt={favoriteDrivers[0].name} className="drv-avatar" />
                <div className="drv-info">
                  <h4>{favoriteDrivers[0].name}</h4>
                  <div className="drv-rating">⭐ {favoriteDrivers[0].rating}</div>
                </div>
                <div className="drv-car">
                  <span className="car-model">{favoriteDrivers[0].car}</span>
                  <span className="car-plate">{favoriteDrivers[0].plate}</span>
                </div>
              </div>
              <div className="action-buttons mt-4">
                <button className="btn btn-secondary" style={{flex:1}}>Mensagem</button>
                <button className="btn btn-secondary" style={{flex:1, color:'#ef4444'}} onClick={resetFlow}>Cancelar</button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ===== SIDE MENU ===== */}
      {isMenuOpen && (
        <div className="side-menu-overlay" onClick={() => setIsMenuOpen(false)}>
          <div className="side-menu-drawer animate-slide-right" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-close" onClick={() => setIsMenuOpen(false)}>✕</div>
            <div className="menu-nav-list">
              <div className="menu-user-header">
                <div className="user-avatar-large">{user?.name?.charAt(0) || 'P'}</div>
                <div>
                  <h3 style={{margin:0}}>{user?.name || 'Passageiro'}</h3>
                  <span className="badge-nearby">Passageiro</span>
                </div>
              </div>
              <hr />
              <button className="menu-nav-btn" onClick={resetFlow}>Nova Viagem</button>
              <button className="menu-nav-btn">Meu Perfil</button>
              <button className="menu-nav-btn">Histórico</button>
              <button className="menu-nav-btn">Favoritos</button>
              <div className="menu-spacer"></div>
              <button className="menu-nav-btn text-danger" onClick={() => { logout(); navigate('/passageiro') }}>
                Sair do App
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
