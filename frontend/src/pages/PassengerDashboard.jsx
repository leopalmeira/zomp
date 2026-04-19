import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, getCurrentUser, requestRide, getRideHistory } from '../services/api'
import { MapContainer, TileLayer, useMap, Marker, Polyline, Popup } from 'react-leaflet'
import { User, Clock, Star, Calendar, LogOut, ChevronRight, MapPin, Send, Check, Camera } from 'lucide-react'
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
const stopIcon = createIcon('#F59E0B')

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
async function fetchOSRMRoute(originCoords, destCoords, stopsCoords = []) {
  const allCoords = [originCoords, ...stopsCoords, destCoords].filter(Boolean)
  const coordString = allCoords.map(c => `${c[1]},${c[0]}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`
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
  const [originAddr, setOriginAddr] = useState('')
  const [originCoords, setOriginCoords] = useState(null)
  const [destAddr, setDestAddr] = useState('')
  const [destCoords, setDestCoords] = useState(null)

  // Keep refs for latest coords to avoid stale closures
  const originCoordsRef = useRef(null)
  const destCoordsRef = useRef(null)
  useEffect(() => { originCoordsRef.current = originCoords }, [originCoords])
  useEffect(() => { destCoordsRef.current = destCoords }, [destCoords])

  // Stops
  const [stops, setStops] = useState([]) // array of {addr: '', coords: null}
  const stopsRef = useRef(stops)
  useEffect(() => { stopsRef.current = stops }, [stops])

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

  // We will define getPrice below, after rideHistory is loaded

  // Profile data
  const [profileData, setProfileData] = useState({
    name: user?.name || 'Leandro Palmeira',
    email: user?.email || 'leandro@exemplo.com'
  })

  // State machine: IDLE -> PRICED -> SCHEDULING | SEARCHING -> ACCEPTED
  const [rideState, setRideState] = useState('IDLE')
  const [isLoading, setIsLoading] = useState(false)
  const [scheduleData, setScheduleData] = useState({ date: '', time: '' })
  const [activeRideId, setActiveRideId] = useState(null)
  
  // Intercity Trips State
  const [isIntercity, setIsIntercity] = useState(false)
  const [isAnalyzingPrint, setIsAnalyzingPrint] = useState(false)
  const [hasCompetitionDiscount, setHasCompetitionDiscount] = useState(false)
  const [compPriceRead, setCompPriceRead] = useState(0)
  const [passengersCount, setPassengersCount] = useState(1)

  // Freight State
  const [freightType, setFreightType] = useState(null) // 'caixas' | 'sacos'
  const [freightDescription, setFreightDescription] = useState('')
  const [freightContactName, setFreightContactName] = useState('')
  const [freightContactPhone, setFreightContactPhone] = useState('')
  const [freightSecurityCode, setFreightSecurityCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('PIX') // 'PIX' | 'DINHEIRO'
  const FREIGHT_PRICE_PER_KM = 2.70

  // Active Ride Extra States
  const [cancelCountdown, setCancelCountdown] = useState(119)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [ratingStars, setRatingStars] = useState(0)
  const [tempDriverFav, setTempDriverFav] = useState(false)

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
    } catch (e) { return [] }
  })

  // Persist scheduled rides to localStorage
  useEffect(() => {
    localStorage.setItem('zomp_scheduled_rides', JSON.stringify(scheduledRides))
  }, [scheduledRides])

  // Favorite drivers state
  const [favoriteDriversState, setFavoriteDriversState] = useState([
    { id: 1, name: 'Carlos Santos', car: 'Chevrolet Onix', plate: 'BRA-2031', rating: '4.9', img: 'https://i.pravatar.cc/150?img=11', pixKey: '(21) 98888-7777' },
    { id: 2, name: 'Ana Silva', car: 'Hyundai HB20', plate: 'XPT-9988', rating: '5.0', img: 'https://i.pravatar.cc/150?img=5', pixKey: 'anasilva@pix.com' }
  ])

  // History state from API
  const [rideHistory, setRideHistory] = useState([]);

  useEffect(() => {
    async function loadHistory() {
      try {
        const history = await getRideHistory();
        if (!Array.isArray(history)) {
          setRideHistory([]);
          return;
        }
        const formatted = [];
        for (const h of history) {
          try {
            const createdAt = h.createdAt || new Date().toISOString();
            const datePart = createdAt.split('T')[0];
            const dp = datePart.split('-');
            formatted.push({
              id: h.id,
              rawDate: new Date(createdAt),
              date: dp.length === 3 ? `${dp[2]}/${dp[1]}/${dp[0]}` : datePart,
              origin: h.origin || '-',
              dest: h.destination || '-',
              price: h.price != null ? Number(h.price).toFixed(2) : '0.00',
              vehicle: h.vehicleType === 'car' ? 'Carro' : 'Moto',
              status: h.status || 'UNKNOWN'
            });
          } catch (itemErr) {
            console.warn('Skipping malformed ride history item:', itemErr);
          }
        }
        setRideHistory(formatted);
      } catch (err) {
        console.error('Failed to load history', err);
        setRideHistory([]);
      }
    }
    loadHistory();
  }, [rideState]); // re-fetch history when ride state changes (e.g. after ride ends)

  const pendingFeeAmount = rideHistory
    .filter(h => h.status === 'CANCELED_FEE' && !h.feePaid)
    .reduce((sum, h) => sum + parseFloat(h.price || 0), 0)

  // Dynamically evaluate if trip is intercity
  const isTripIntercity = isIntercity || parseFloat(routeKm) > 90

  // Compute price based on vehicle type and distance
  const getPrice = (km, type, includeFee = false) => {
    const validStopsCount = stops.filter(s => s.coords || s.addr.length > 3).length
    const stopsFee = validStopsCount * 2.00
    
    let calculated;
    if (isTripIntercity && type === 'car') {
      calculated = parseFloat(km) * 1.70; // Taxa fixa Viagens Longas
    } else {
      calculated = parseFloat(km) * PRICE_PER_KM[type];
    }
    
    // Pequena taxa adicional fixa por passageiro extra selecionado (opcional mas bom para compor a tarifa justa)
    const extraPsg = (type === 'car' && passengersCount > 1) ? (passengersCount - 1) * 2.50 : 0;

    const basePrice = Math.max(calculated, MIN_PRICE[type]) + stopsFee + extraPsg
    let finalPrice = includeFee ? basePrice + pendingFeeAmount : basePrice
    
    // If we have a validated competition match, we MUST be cheaper than their price
    if (hasCompetitionDiscount && compPriceRead > 0) {
      return Math.max(compPriceRead - 2.00, MIN_PRICE[type]).toFixed(2);
    }
    
    // Apply standard discount if no specific price was read from print
    if (hasCompetitionDiscount) {
      finalPrice = Math.max(finalPrice - 2.00, MIN_PRICE[type]);
    }
    
    return finalPrice.toFixed(2)
  }

  // ============= GPS tracking =============
  // Runs ONCE on mount only — no dependencies to prevent infinite re-creation
  useEffect(() => {
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const c = [pos.coords.latitude, pos.coords.longitude]
          setMapCenter(c)
          setOriginCoords(c)
          setOriginAddr(prev => prev ? prev : 'Sua Localização')
        },
        (err) => {
          console.error('GPS error:', err)
          // Safe: no crash if originCoords is null
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      )
    }
    return () => {
      if(watchId) navigator.geolocation.clearWatch(watchId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // Empty deps = run only on mount

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
    } else if (sugTarget === 'dest') {
      setDestAddr(shortAddr)
      setDestCoords(coords)
    } else if (sugTarget.startsWith('stop_')) {
      const idx = parseInt(sugTarget.split('_')[1])
      const newStops = [...stops]
      newStops[idx] = { addr: shortAddr, coords }
      setStops(newStops)
    }

    setSuggestions([])

    // Try to calculate route immediately if enough coords are ready
    const oCoords = sugTarget === 'origin' ? coords : originCoordsRef.current
    const dCoords = sugTarget === 'dest' ? coords : destCoordsRef.current
    const sCoords = sugTarget.startsWith('stop_') 
      ? stopsRef.current.map((s, i) => i === parseInt(sugTarget.split('_')[1]) ? coords : s.coords) 
      : stopsRef.current.map(s => s.coords)

    if (oCoords && dCoords) {
      await calculateRoute(oCoords, dCoords, sCoords.filter(Boolean))
    }
  }

  // ============= Calculate route (core function) =============
  const calculateRoute = async (oCoords, dCoords, sCoords = []) => {
    setIsLoading(true)
    try {
      const result = await fetchOSRMRoute(oCoords, dCoords, sCoords)
      if (result) {
        setRouteGeometry(result.geometry)
        setRouteKm(result.km)
        setRouteDuration(result.durationMin)
        // Somente vai para PRICED se não estiver na tela de FRETE
        setRideState(prev => prev === 'FREIGHT' ? 'FREIGHT' : 'PRICED')
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
      // Use refs for latest coords (avoids stale closure from GPS)
      let oCoords = originCoordsRef.current
      if (!oCoords) {
        // Try HTML5 Geolocation first before falling back to text resolve
        try {
          const gpsPos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true, timeout: 5000, maximumAge: 10000
            })
          })
          oCoords = [gpsPos.coords.latitude, gpsPos.coords.longitude]
          setOriginCoords(oCoords)
          setMapCenter(oCoords)
          setOriginAddr('Sua Localização')
        } catch (gpsErr) {
          // GPS failed, try text resolve as fallback
          const resolved = await resolveAddress(originAddr)
          if (resolved) {
            oCoords = [resolved.lat, resolved.lon]
            setOriginCoords(oCoords)
            setMapCenter(oCoords)
          }
        }
      }

      // Resolve destination if no coords
      let dCoords = destCoordsRef.current
      if (!dCoords) {
        const resolved = await resolveAddress(destAddr)
        if (resolved) {
          dCoords = [resolved.lat, resolved.lon]
          setDestCoords(dCoords)
        }
      }

      // Resolve stops
      let resolvedStops = []
      const currentStops = stopsRef.current
      for (let i = 0; i < currentStops.length; i++) {
        let sc = currentStops[i].coords
        if (!sc && currentStops[i].addr.length >= 4) {
          const res = await resolveAddress(currentStops[i].addr)
          if (res) sc = [res.lat, res.lon]
        }
        if (sc) resolvedStops.push(sc)
      }

      if (oCoords && dCoords) {
        await calculateRoute(oCoords, dCoords, resolvedStops)
      } else {
        alert('Não foi possível encontrar os endereços. Verifique se o GPS está ativado ou digite um endereço de partida.')
      }
    } catch (e) {
      console.error('Force calculate error:', e)
    } finally {
      setIsLoading(false)
    }
  }

  // ============= Call now =============
  const handleCallNow = async () => {
    setIsLoading(true);
    try {
      // Clear pending fees since they were applied to this ride (locally mocked for now or could be stored in DB)
      if (pendingFeeAmount > 0) {
        setRideHistory(prev => prev.map(h => h.status === 'CANCELED_FEE' ? { ...h, feePaid: true } : h))
      }

      const ridePayload = {
        origin: originAddr,
        destination: destAddr,
        price: parseFloat(getPrice(routeKm, vehicleType, true)),
        distanceKm: parseFloat(routeKm),
        vehicleType
      };

      const newRide = await requestRide(ridePayload);
      console.log('Ride created via API:', newRide);
      setActiveRideId(newRide.id);

      setRideState('SEARCHING')
      const delay = prioritizeFavs ? 4000 : 2000
      setTimeout(() => {
        setRideState('ACCEPTED')
        setCancelCountdown(119) // Starts the cancel grace period
      }, delay)
    } catch (e) {
      console.error(e)
      alert("Falha ao chamar motorista. Tente novamente.")
    } finally {
      setIsLoading(false);
    }
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
    setCancelCountdown(119)
    setIsChatOpen(false)
    setChatMessages([])
    setActiveRideId(null)
    setIsIntercity(false)
    setPassengersCount(1)
    setStops([])
    // Reset competition discount (per-trip only)
    setHasCompetitionDiscount(false)
    setCompPriceRead(0)
    setIsAnalyzingPrint(false)
  }

  // ============= Markers for map =============
  const allMarkers = [originCoords, ...stops.map(s => s.coords), destCoords].filter(Boolean)

  return (
    <div className="passenger-app">

      {/* ===== MAP ===== */}
      <div className="passenger-map-bg">
        <MapContainer center={mapCenter} zoom={16} zoomControl={false} style={{width:'100%', height:'100%'}}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapController center={mapCenter} markers={allMarkers} />
          {originCoords && (
            <Marker position={originCoords} icon={originIcon}>
              <Popup autoPan={false}>
                <div style={{fontWeight:800}}>Partida</div>
                <div style={{fontSize:'0.75rem'}}>{originAddr}</div>
              </Popup>
            </Marker>
          )}
          {stops.filter(s => s.coords).map((stop, i) => (
             <Marker key={`stop-marker-${i}`} position={stop.coords} icon={stopIcon}>
               <Popup autoPan={false}>
                 <div style={{fontWeight:800}}>Parada {i+1}</div>
                 <div style={{fontSize:'0.75rem'}}>{stop.addr}</div>
               </Popup>
             </Marker>
          ))}
          {destCoords && (
            <Marker position={destCoords} icon={destIcon}>
              <Popup autoPan={false}>
                <div style={{fontWeight:800}}>Destino</div>
                <div style={{fontSize:'0.75rem'}}>{destAddr}</div>
              </Popup>
            </Marker>
          )}
          
          {Array.isArray(routeGeometry) && routeGeometry.length > 0 && (
            <Polyline positions={routeGeometry} color="#00E676" weight={6} opacity={0.9} lineCap="round" />
          )}
        </MapContainer>
      </div>

      {/* ===== TOP HEADER + ADDRESS INPUTS (always visible) ===== */}
      <div className="passenger-top-header">
        <div className="menu-btn" onClick={() => setIsMenuOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </div>
      </div>

      {/* ===== FIXED ADDRESS BAR (always on top) ===== */}
      {rideState === 'IDLE' && (
        <div className="fixed-address-bar animate-fade-in">
          <div className="route-inputs">
            <div className="route-timeline" style={{paddingTop: '8px', paddingBottom: '8px'}}>
              <div className="dot-start" style={{width:'6px', height:'6px'}}></div>
              <div className="timeline-line"></div>
              {stops.map((_, si) => (
                <React.Fragment key={`dot-stop-${si}`}>
                  <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#f59e0b',border:'1px solid #fff',boxShadow:'0 1px 4px rgba(0,0,0,0.15)',zIndex:1}}></div>
                  <div className="timeline-line"></div>
                </React.Fragment>
              ))}
              <div className="dot-end" style={{width:'6px', height:'6px'}}></div>
            </div>
            <div className="route-fields">
              <input
                className="route-input"
                value={originAddr}
                onChange={(e) => {
                  const v = e.target.value
                  setOriginAddr(v)
                  setOriginCoords(null)
                  searchAddress(v, 'origin')
                }}
                placeholder="Partida"
              />
              {stops.map((stop, si) => (
                <div key={`stop-${si}`} className="stop-input-row">
                  <input
                    className="route-input"
                    style={{flex:1}}
                    value={stop.addr}
                    onChange={(e) => {
                      const v = e.target.value
                      const newStops = [...stops]
                      newStops[si] = { addr: v, coords: null }
                      setStops(newStops)
                      searchAddress(v, `stop_${si}`)
                    }}
                    placeholder={`Parada ${si + 1}`}
                  />
                  <button className="remove-stop-btn" onClick={() => setStops(stops.filter((_, i) => i !== si))}>✕</button>
                </div>
              ))}
              <input
                className="route-input"
                style={{borderTop: (stops.length > 0 || originAddr) ? '1px solid #f1f5f9' : 'none'}}
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

            {/* Compact Add Stop Button */}
            {stops.length < 2 && (
              <button 
                className="add-stop-mini-btn" 
                onClick={() => setStops([...stops, { addr: '', coords: null }])}
                title="Adicionar Parada"
              >
                +
              </button>
            )}

            {/* Suggestions dropdown */}
            {suggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {suggestions.map((s, i) => (
                  <div key={i} className="suggestion-item" onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s) }}>
                    <MapPin size={14} color="#888" />
                    <span>{s.display_name.split(',').slice(0, 3).join(',')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isLoading && (
            <div style={{marginTop:'10px', textAlign:'center', fontSize:'0.85rem', color:'#059669', fontWeight:700}}>
              ⏳ Calculando melhor rota...
            </div>
          )}
        </div>
      )}

      {/* ===== BOTTOM SHEET ===== */}
      <div className={`passenger-bottom-sheet ${isSheetCollapsed ? 'collapsed' : ''}`}>
        <div className="sheet-drag-area" onClick={() => setIsSheetCollapsed(!isSheetCollapsed)}>
          <div className="sheet-handle"></div>
        </div>

        <div className="sheet-content-wrapper">

          {/* ---- STATE: IDLE ---- */}
          {rideState === 'IDLE' && (
            <div className="state-idle animate-fade-in">

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

              {/* Viagens Longas */}
              <div className="intercity-section" style={{marginTop:'20px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                  <h3 style={{fontSize:'1.05rem',fontWeight:800,margin:0,color:'#18181b'}}>Viagens Longas</h3>
                </div>
                <div style={{display:'flex',overflowX:'auto',gap:'12px',paddingBottom:'16px',scrollSnapType:'x mandatory',WebkitOverflowScrolling:'touch'}} className="hide-scrollbar">
                  {[
                    { id: 'angra', title: 'Angra dos Reis', label: 'Praia', img: '/angra.png' },
                    { id: 'mangaratiba', title: 'Mangaratiba', label: 'Praia', img: '/mangaratiba.png' },
                    { id: 'buzios', title: 'Búzios', label: 'Praia', img: '/buzios.png' },
                    { id: 'cabo', title: 'Cabo Frio', label: 'Praia', img: '/cabo.png' },
                    { id: 'arraial', title: 'Arraial do Cabo', label: 'Praia', img: '/arraial.png' },
                    { id: 'saquarema', title: 'Saquarema', label: 'Praia', img: '/saquarema.png' },
                    { id: 'paraty', title: 'Paraty', label: 'Praia', img: '/paraty.png' },
                    { id: 'ostras', title: 'Rio das Ostras', label: 'Praia', img: '/ostras.png' },
                    { id: 'petropolis', title: 'Petrópolis', label: 'Montanha', img: '/petropolis.png' },
                    { id: 'teresopolis', title: 'Teresópolis', label: 'Montanha', img: '/teresopolis.png' },
                    { id: 'friburgo', title: 'Nova Friburgo', label: 'Montanha', img: 'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=400&q=80' },
                    { id: 'vassouras', title: 'Vassouras', label: 'Interior', img: 'https://images.unsplash.com/photo-1506506200949-df87442881d3?w=400&q=80' },
                    { id: 'valenca', title: 'Valença', label: 'Interior', img: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&q=80' },
                    { id: 'barra_pirai', title: 'Barra do Piraí', label: 'Interior', img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=400&q=80' },
                    { id: 'resende', title: 'Resende', label: 'Interior', img: '/resende.png' },
                    { id: 'campos', title: 'Campos', label: 'Interior', img: '/campos.png' }
                  ].map(dest => (
                    <div key={dest.id} style={{
                        position: 'relative',
                        minWidth:'150px',
                        height: '180px',
                        borderRadius:'20px',
                        overflow:'hidden',
                        background:'#000',
                        boxShadow:'0 8px 20px rgba(0,0,0,0.12)',
                        cursor:'pointer',
                        flexShrink:0,
                        scrollSnapAlign:'start',
                        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    }} onClick={async () => {
                        setIsIntercity(true);
                        setDestAddr(`${dest.title}, RJ`);
                        setDestCoords(null);
                        setIsLoading(true);
                        try {
                          // Resolve dest coordinates directly
                          const resolved = await resolveAddress(`${dest.title}, Rio de Janeiro, RJ, Brasil`);
                          if (resolved) {
                            const dCoords = [resolved.lat, resolved.lon];
                            setDestCoords(dCoords);
                            // Get origin from GPS ref
                            let oCoords = originCoordsRef.current;
                            if (!oCoords) {
                              try {
                                const gpsPos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 }));
                                oCoords = [gpsPos.coords.latitude, gpsPos.coords.longitude];
                                setOriginCoords(oCoords);
                                setMapCenter(oCoords);
                              } catch(e) { /* GPS failed */ }
                            }
                            if (oCoords) {
                              await calculateRoute(oCoords, dCoords);
                            } else {
                              alert('Ative o GPS ou digite seu endereço de partida.');
                            }
                          } else {
                            alert('Não foi possível localizar ' + dest.title);
                          }
                        } catch(e) {
                          console.error(e);
                        } finally {
                          setIsLoading(false);
                        }
                    }} onMouseEnter={(e) => { e.currentTarget.style.transform='scale(1.04)'; e.currentTarget.style.boxShadow='0 12px 24px rgba(0,0,0,0.2)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,0.12)'; }}>
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundImage:`url(${dest.img})`,
                        backgroundSize:'cover',
                        backgroundPosition:'center',
                        transition: 'transform 0.5s ease',
                      }} className="dest-bg-img"></div>
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%)'
                      }}></div>
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding:'16px',
                        display: 'flex', flexDirection: 'column', gap: '4px'
                      }}>
                         <span style={{fontSize:'0.65rem',color:'#10b981',fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', textShadow:'0 2px 4px rgba(0,0,0,0.5)'}}>{dest.label}</span>
                         <h4 style={{margin:0,fontSize:'1.1rem',fontWeight:800,color:'#fff', textShadow:'0 2px 4px rgba(0,0,0,0.5)'}}>{dest.title}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fretes e Entregas */}
              <div className="intercity-section" style={{marginTop:'20px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                  <h3 style={{fontSize:'1.05rem',fontWeight:800,margin:0,color:'#18181b'}}>Fretes e Entregas</h3>
                  <span style={{fontSize:'0.7rem',fontWeight:800,color:'#f59e0b',background:'#fffbeb',padding:'4px 8px',borderRadius:'100px'}}>NOVO</span>
                </div>
                <div style={{display:'flex',gap:'12px',overflowX:'auto',paddingBottom:'16px',scrollSnapType:'x mandatory',WebkitOverflowScrolling:'touch'}} className="hide-scrollbar">
                  {[
                    { id: 'caixas', icon: '📦', title: 'Caixas', desc: 'Mudanças e volumes' },
                    { id: 'sacos', icon: '🛍️', title: 'Sacos & Sacolas', desc: 'Compras e materiais' },
                  ].map(item => (
                    <div key={item.id} style={{
                      minWidth: '140px',
                      background: '#fff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '16px',
                      padding: '20px 16px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      scrollSnapAlign: 'start',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'center',
                      transition: 'all 0.25s ease',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor='#10b981'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor='#e4e4e7'; }}
                    onClick={() => {
                      setFreightType(item.id);
                      setFreightDescription('');
                      setDestAddr('');
                      setDestCoords(null);
                      setRouteGeometry([]);
                      setRouteKm('0');
                      setVehicleType('car');
                      setFreightSecurityCode('');
                      setRideState('FREIGHT');
                    }}
                    >
                      <span style={{fontSize:'2.2rem'}}>{item.icon}</span>
                      <span style={{fontSize:'0.9rem',fontWeight:800,color:'#18181b'}}>{item.title}</span>
                      <span style={{fontSize:'0.7rem',color:'#71717a',fontWeight:600,lineHeight:1.3}}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ---- STATE: FREIGHT ---- */}
          {rideState === 'FREIGHT' && (
            <div className="state-freight animate-fade-in-up">
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px'}}>
                <button onClick={() => { setRideState('IDLE'); setFreightType(null); setFreightDescription(''); setRouteGeometry([]); setRouteKm('0'); }} style={{background:'none',border:'none',cursor:'pointer',fontSize:'1.4rem',padding:'4px'}}>←</button>
                <h2 className="sheet-title" style={{margin:0}}>🚚 Frete: {freightType === 'caixas' ? 'Caixas' : 'Sacos & Sacolas'}</h2>
              </div>

              {/* Freight Address Inputs */}
              <div className="route-inputs" style={{marginBottom:'16px'}}>
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
                    placeholder="Endereço de coleta"
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
                    placeholder="Endereço de entrega"
                  />
                </div>
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

              {/* Product Description */}
              <div style={{marginBottom:'16px'}}>
                <label style={{fontSize:'0.85rem',fontWeight:700,color:'#374151',display:'block',marginBottom:'8px'}}>Descrição do Produto</label>
                <textarea
                  value={freightDescription}
                  onChange={(e) => setFreightDescription(e.target.value)}
                  placeholder={freightType === 'caixas' ? 'Ex: 3 caixas de mudança, peso aprox. 20kg cada...' : 'Ex: 5 sacolas de compras do supermercado...'}
                  style={{
                    width:'100%',
                    minHeight:'80px',
                    padding:'14px',
                    borderRadius:'14px',
                    border:'1px solid #d1d5db',
                    fontSize:'0.9rem',
                    fontFamily:'inherit',
                    resize:'vertical',
                    outline:'none',
                    transition:'border-color 0.2s',
                    boxSizing:'border-box',
                    marginBottom:'12px'
                  }}
                  onFocus={(e) => e.target.style.borderColor='#10b981'}
                  onBlur={(e) => e.target.style.borderColor='#d1d5db'}
                />

                <div style={{display:'flex', gap:'12px', flexWrap:'wrap'}}>
                  <div style={{flex:1, minWidth:'150px'}}>
                    <label style={{fontSize:'0.75rem',fontWeight:700,color:'#374151',display:'block',marginBottom:'6px'}}>Quem receberá? (Opcional)</label>
                    <input
                      value={freightContactName}
                      onChange={(e) => setFreightContactName(e.target.value)}
                      placeholder="Nome de quem recebe"
                      style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #d1d5db',fontSize:'0.9rem',outline:'none'}}
                    />
                  </div>
                  <div style={{flex:1, minWidth:'150px'}}>
                    <label style={{fontSize:'0.75rem',fontWeight:700,color:'#374151',display:'block',marginBottom:'6px'}}>Telefone de Contato (Opcional)</label>
                    <input
                      type="tel"
                      value={freightContactPhone}
                      onChange={(e) => setFreightContactPhone(e.target.value)}
                      placeholder="(21) 99999-9999"
                      style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #d1d5db',fontSize:'0.9rem',outline:'none'}}
                    />
                  </div>
                </div>
              </div>

              {/* Freight Price Result */}
              {parseFloat(routeKm) > 0 && (
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'16px',padding:'20px',marginBottom:'16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                    <span style={{fontSize:'0.85rem',fontWeight:700,color:'#166534'}}>Distância</span>
                    <span style={{fontSize:'0.95rem',fontWeight:800,color:'#166534'}}>{routeKm} km</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'1rem',fontWeight:800,color:'#166534'}}>Valor do Frete</span>
                    <span style={{fontSize:'1.4rem',fontWeight:900,color:'#059669'}}>R$ {Math.max(parseFloat(routeKm) * FREIGHT_PRICE_PER_KM, 15.00).toFixed(2)}</span>
                  </div>
                  <p style={{margin:'12px 0 0',fontSize:'0.75rem',color:'#6b7280',fontWeight:600}}>Valor final calculado pela distância da rota</p>
                </div>
              )}

              {/* Payment Method Selector */}
              {parseFloat(routeKm) > 0 && (
                <div style={{marginBottom:'16px'}}>
                  <label style={{fontSize:'0.85rem',fontWeight:700,color:'#374151',display:'block',marginBottom:'8px'}}>Forma de Pagamento</label>
                  <div style={{display:'flex', gap:'12px'}}>
                    <button
                      onClick={() => setPaymentMethod('PIX')}
                      style={{
                        flex:1, padding:'14px', borderRadius:'12px', fontWeight:800, cursor:'pointer', transition:'all 0.2s',
                        border: paymentMethod === 'PIX' ? '2px solid #10b981' : '1px solid #d1d5db',
                        background: paymentMethod === 'PIX' ? '#ecfdf5' : '#fff',
                        color: paymentMethod === 'PIX' ? '#059669' : '#4b5563'
                      }}
                    >
                      <span style={{fontSize:'1.1rem', marginRight:'4px'}}>❖</span> PIX
                    </button>
                    <button
                      onClick={() => setPaymentMethod('DINHEIRO')}
                      style={{
                        flex:1, padding:'14px', borderRadius:'12px', fontWeight:800, cursor:'pointer', transition:'all 0.2s',
                        border: paymentMethod === 'DINHEIRO' ? '2px solid #10b981' : '1px solid #d1d5db',
                        background: paymentMethod === 'DINHEIRO' ? '#ecfdf5' : '#fff',
                        color: paymentMethod === 'DINHEIRO' ? '#059669' : '#4b5563'
                      }}
                    >
                      <span style={{fontSize:'1.1rem', marginRight:'4px'}}>💵</span> Dinheiro
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Freight */}
              <button
                className="btn btn-primary btn-request"
                style={{width:'100%', padding:'16px', fontWeight:800, fontSize:'1rem', borderRadius:'14px', background:'#059669'}}
                disabled={!freightDescription.trim()}
                onClick={() => {
                  if (parseFloat(routeKm) === 0) {
                    alert('Por favor, selecione um endereço válido nas sugestões para calcularmos a distância do frete.');
                    return;
                  }
                  if (!freightDescription.trim()) {
                    alert('Por favor, descreva o que será transportado.');
                    return;
                  }
                  const newCode = Math.floor(1000 + Math.random() * 9000).toString();
                  setFreightSecurityCode(newCode);

                  // Simulate sending freight request (like ride request)
                  alert(`✅ Frete solicitado!\n\nTipo: ${freightType === 'caixas' ? 'Caixas' : 'Sacos & Sacolas'}\nDescrição: ${freightDescription}\nContato: ${freightContactName || 'Não informado'} ${freightContactPhone ? `(${freightContactPhone})` : ''}\nColeta: ${originAddr}\nEntrega: ${destAddr}\nDistância: ${routeKm} km\nValor: R$ ${Math.max(parseFloat(routeKm) * FREIGHT_PRICE_PER_KM, 15.00).toFixed(2)}\nPagamento: ${paymentMethod === 'PIX' ? 'PIX ❖' : 'Dinheiro 💵'}\n\nCódigo Temporário: ${newCode}\n\nProcurando motorista...`);
                  setRideState('SEARCHING');
                }}
              >
                🚚 SOLICITAR FRETE {parseFloat(routeKm) > 0 ? `— R$ ${Math.max(parseFloat(routeKm) * FREIGHT_PRICE_PER_KM, 15.00).toFixed(2)}` : ''}
              </button>
            </div>
          )}

          {/* ---- STATE: PRICED ---- */}
          {rideState === 'PRICED' && (
            <div className="state-priced animate-fade-in-up">
              <h2 className="sheet-title" style={{marginBottom:'8px'}}>Resumo da Viagem</h2>
              <p className="route-desc">{originAddr} → {stops.filter(s => s.addr).map(s => s.addr).join(' → ')}{stops.filter(s => s.addr).length > 0 ? ' → ' : ''}{destAddr}</p>

              {stops.filter(s => s.addr).length > 0 && (
                <div style={{
                  background:'#fffbeb', border:'1px solid #fde68a', padding:'12px 16px',
                  borderRadius:'12px', marginBottom:'16px', display:'flex',
                  alignItems:'center', gap:'10px'
                }}>
                  <span style={{fontSize:'1.1rem'}}>📍</span>
                  <div>
                    <span style={{fontWeight:700, color:'#92400e', fontSize:'0.85rem'}}>
                      {stops.filter(s => s.addr).length} parada{stops.filter(s => s.addr).length > 1 ? 's' : ''} adicionada{stops.filter(s => s.addr).length > 1 ? 's' : ''}
                    </span>
                    <span style={{fontWeight:800, color:'#b45309', fontSize:'0.85rem', marginLeft:'8px'}}>
                      +R$ {(stops.filter(s => s.addr).length * 2).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Vehicle Type Selector */}
              <div className="vehicle-selector">
                <div
                  className={`vehicle-option ${vehicleType === 'car' ? 'active' : ''}`}
                  onClick={() => setVehicleType('car')}
                >
                  <div style={{display:'flex', alignItems:'center', gap:'12px', width:'100%'}}>
                    <span className="vehicle-icon">🚗</span>
                    <div className="vehicle-details">
                      <span className="vehicle-name">{isTripIntercity ? 'Carro Seguro' : 'Carro'}</span>
                      <span className="vehicle-price">R$ {getPrice(routeKm, 'car', true)}</span>
                    </div>
                  </div>
                  
                  {vehicleType === 'car' && (
                    <div className="integrated-counter-border" onClick={(e) => e.stopPropagation()}>
                       <div className="counter-label">
                         <User size={12} />
                         <span>Pessoas</span>
                       </div>
                       <div className="counter-actions-spaced">
                         <button onClick={() => setPassengersCount(Math.max(1, passengersCount - 1))}>-</button>
                         <span className="count">{passengersCount}</span>
                         <button onClick={() => setPassengersCount(Math.min(4, passengersCount + 1))}>+</button>
                       </div>
                    </div>
                  )}
                  <span className="vehicle-info">{isTripIntercity ? 'Viagem Longa' : 'Conforto'}</span>
                </div>
                
                {!isTripIntercity && (
                  <div
                    className={`vehicle-option ${vehicleType === 'moto' ? 'active' : ''}`}
                    onClick={() => setVehicleType('moto')}
                  >
                    <span className="vehicle-icon">🏍️</span>
                    <div className="vehicle-details">
                      <span className="vehicle-name">Moto</span>
                      <span className="vehicle-price">R$ {getPrice(routeKm, 'moto', true)}</span>
                    </div>
                    <span className="vehicle-info">Econômico</span>
                  </div>
                )}
              </div>

              <div className="price-box">
                <div className="price-val">
                  <span className="currency">R$</span> {getPrice(routeKm, vehicleType, true)}
                </div>
                <div className="dist-val">{routeKm} km estimado</div>
              </div>

              {parseFloat(routeKm) * PRICE_PER_KM[vehicleType] < MIN_PRICE[vehicleType] && (
                <p className="hint-text" style={{marginBottom:'12px', color:'#f59e0b'}}>
                  ⚠️ Tarifa mínima aplicada ({vehicleType === 'car' ? 'Carro: R$ 8,40' : 'Moto: R$ 7,20'})
                </p>
              )}

              {/* Payment Method Selector */}
              <div style={{marginBottom:'16px'}}>
                <label style={{fontSize:'0.85rem',fontWeight:700,color:'#374151',display:'block',marginBottom:'8px'}}>Forma de Pagamento</label>
                <div style={{display:'flex', gap:'12px'}}>
                  <button
                    onClick={() => setPaymentMethod('PIX')}
                    style={{
                      flex:1, padding:'14px', borderRadius:'12px', fontWeight:800, cursor:'pointer', transition:'all 0.2s',
                      border: paymentMethod === 'PIX' ? '2px solid #10b981' : '1px solid #d1d5db',
                      background: paymentMethod === 'PIX' ? '#ecfdf5' : '#fff',
                      color: paymentMethod === 'PIX' ? '#059669' : '#4b5563'
                    }}
                  >
                    <span style={{fontSize:'1.1rem', marginRight:'4px'}}>❖</span> PIX
                  </button>
                  <button
                    onClick={() => setPaymentMethod('DINHEIRO')}
                    style={{
                      flex:1, padding:'14px', borderRadius:'12px', fontWeight:800, cursor:'pointer', transition:'all 0.2s',
                      border: paymentMethod === 'DINHEIRO' ? '2px solid #10b981' : '1px solid #d1d5db',
                      background: paymentMethod === 'DINHEIRO' ? '#ecfdf5' : '#fff',
                      color: paymentMethod === 'DINHEIRO' ? '#059669' : '#4b5563'
                    }}
                  >
                    <span style={{fontSize:'1.1rem', marginRight:'4px'}}>💵</span> Dinheiro
                  </button>
                </div>
              </div>

              {pendingFeeAmount > 0 && (
                <div style={{background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', marginBottom: '16px'}}>
                  <p style={{fontSize: '0.85rem', color: '#b91c1c', margin: 0, fontWeight: 700}}>
                    ⚠️ Seu último cancelamento gerou uma taxa de deslocamento pendente de R$ {pendingFeeAmount.toFixed(2)}. Este valor foi adicionado ao total desta corrida.
                  </p>
                </div>
              )}

              {/* Challenge Price Box */}
              <div className="price-challenge-box animate-fade-in">
                <div className="challenge-icon">🔥</div>
                <div className="challenge-content">
                  <h4 style={{fontSize: '0.85rem', fontWeight: 800, color: '#b91c1c', margin: 0}}>PREÇO IMBATÍVEL ZOMP</h4>
                  <p style={{fontSize: '0.75rem', fontWeight: 600, color: '#7f1d1d', margin: '2px 0 6px'}}>Tem print da Uber ou 99? Cobrimos e damos + R$ 2,00 de desconto!</p>
                  
                  {isAnalyzingPrint ? (
                    <div style={{fontSize: '0.75rem', color: '#b91c1c', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px'}}>
                       <span className="animate-pulse">🔍 IA Lendo valor no print...</span>
                    </div>
                  ) : hasCompetitionDiscount ? (
                    <div style={{background:'#f0fdf4', padding:'10px', borderRadius:'12px', border:'1px solid #bbf7d0'}}>
                      <div style={{fontSize: '0.75rem', color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginBottom:'4px'}}>
                         <Check size={14} /> <span>PREÇO IMBATÍVEL APLICADO!</span>
                      </div>
                      <p style={{margin:0, fontSize:'0.7rem', color:'#166534', fontWeight:600}}>
                        Identificamos R$ {compPriceRead.toFixed(2)} no print. <br/>
                        Seu preço Zomp: <strong>R$ {(compPriceRead - 2).toFixed(2)}</strong>
                      </p>
                    </div>
                  ) : (
                    <label htmlFor="price-print" className="challenge-upload-btn">
                      <Camera size={14} /> 
                      <span>Anexar Print da Concorrência</span>
                      <input type="file" id="price-print" accept="image/*" style={{display:'none'}} onChange={(e) => {
                        if(e.target.files?.[0]) {
                          setIsAnalyzingPrint(true);
                          // Generate a "fake" competition price slightly higher than current one for demo
                          const current = parseFloat(getPrice(routeKm, vehicleType));
                          const fakeComp = current + (Math.random() * 5 + 1); 
                          
                          setTimeout(() => {
                            setIsAnalyzingPrint(false);
                            setCompPriceRead(fakeComp);
                            setHasCompetitionDiscount(true);
                          }, 3000);
                        }
                      }} />
                    </label>
                  )}
                </div>
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
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <h4>{favoriteDriversState[0].name}</h4>
                    <button 
                      onClick={() => setTempDriverFav(!tempDriverFav)}
                      style={{background:'none',border:'none',fontSize:'1.2rem',cursor:'pointer',padding:0,color: tempDriverFav ? '#f59e0b' : '#cbd5e1'}}
                    >
                      ★
                    </button>
                  </div>
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

              {freightType && freightSecurityCode && (
                <div style={{background: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '16px', marginBottom: '16px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                    <span style={{fontSize: '1.2rem'}}>🔐</span>
                    <span style={{fontWeight: 800, color: '#92400e', fontSize: '1rem'}}>Código de Segurança</span>
                  </div>
                  <div style={{background: '#fef3c7', padding: '12px', borderRadius: '12px', textAlign: 'center', marginBottom: '12px', border: '2px dashed #f59e0b'}}>
                    <span style={{fontSize: '2rem', fontWeight: 900, color: '#d97706', letterSpacing: '4px'}}>{freightSecurityCode}</span>
                  </div>
                  <p style={{margin: 0, fontSize: '0.8rem', color: '#b45309', fontWeight: 600, lineHeight: 1.4}}>
                    <strong style={{color: '#92400e'}}>Importante:</strong> Informe este código fornecido ao motorista nas pontas de <strong>Retirada e Entrega</strong>. O motorista será obrigado a anexar <strong>2 fotos</strong> (na Origem e no Destino) para validar seu frete.
                  </p>
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
                  onClick={async () => {
                    const statusVal = cancelCountdown > 0 ? 'CANCELED_FREE' : 'CANCELED_FEE';
                    const msg = cancelCountdown > 0 
                      ? 'Deseja realmente cancelar gratuitamente a corrida?' 
                      : 'O período de cancelamento grátis expirou. Uma taxa de deslocamento será cobrada na sua próxima corrida. Deseja cancelar mesmo assim?';

                    if (confirm(msg)) {
                      if (activeRideId) {
                        try {
                           await fetch(`http://localhost:3001/api/rides/${activeRideId}/cancel`, {
                             method: 'PUT',
                             headers: {
                               'Content-Type': 'application/json',
                               'Authorization': `Bearer ${localStorage.getItem('zomp_token')}`
                             },
                             body: JSON.stringify({ status: statusVal })
                           });
                        } catch (e) {
                           console.error('Erro ao cancelar ride no backend', e);
                        }
                      }
                      
                      const d = new Date()
                      const today = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
                      setRideHistory(prev => [{ id: Date.now(), date: today, origin: originAddr, dest: destAddr, price: statusVal === 'CANCELED_FREE' ? '0.00' : '2.80', vehicle: vehicleType === 'car' ? 'Carro' : 'Moto', status: statusVal }, ...prev])
                      resetFlow()
                    }
                  }}
                >
                  <span style={{fontWeight: 800}}>Cancelar</span>
                  {cancelCountdown > 0 ? (
                    <span style={{fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700}}>Grátis ({Math.floor(cancelCountdown / 60)}:{(cancelCountdown % 60).toString().padStart(2, '0')})</span>
                  ) : (
                    <span style={{fontSize: '0.7rem', color: '#ef4444', fontWeight: 700}}>Taxa Aplicável</span>
                  )}
                </button>
              </div>

              {/* Botão de simular chegada para ir para a tela de avaliação */}
              <button 
                className="btn btn-primary mt-4" 
                style={{width: '100%', background: '#059669', color: '#fff'}}
                onClick={() => {
                  setRatingStars(0);
                  setRideState('RATING');
                }}
              >
                Cheguei ao Destino 🏁
              </button>
            </div>
          )}

          {/* ---- STATE: RATING ---- */}
          {rideState === 'RATING' && (
            <div className="state-rating animate-fade-in-up" style={{textAlign: 'center', padding: '20px 0'}}>
              <h2 className="sheet-title" style={{marginBottom: '8px'}}>Corrida Finalizada!</h2>
              <p className="hint-text" style={{marginBottom: '24px'}}>Como foi a viagem com {favoriteDriversState[0]?.name || 'seu motorista'}?</p>
              
              {favoriteDriversState[0]?.img && (
                <img src={favoriteDriversState[0].img} alt={favoriteDriversState[0].name} style={{width:'80px',height:'80px',borderRadius:'50%',marginBottom:'16px',boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
              )}
              
              {paymentMethod === 'PIX' && (
                <div style={{background: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '16px', marginBottom: '24px', textAlign: 'left'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                    <span style={{fontSize: '1.2rem', color: '#10b981'}}>❖</span>
                    <span style={{fontWeight: 800, color: '#92400e', fontSize: '1rem'}}>Pagamento via PIX</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}>
                    <span style={{fontWeight: 600, color: '#b45309', fontSize: '0.9rem'}}>Valor Total:</span>
                    <span style={{fontWeight: 900, color: '#b45309', fontSize: '1.2rem'}}>R$ {freightType ? Math.max(parseFloat(routeKm) * FREIGHT_PRICE_PER_KM, 15.00).toFixed(2) : getPrice(routeKm, vehicleType)}</span>
                  </div>
                  <div style={{background: '#fef3c7', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{fontFamily: 'monospace', fontWeight: 600, color: '#d97706'}}>{favoriteDriversState[0].pixKey || 'Chave não cadastrada'}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(favoriteDriversState[0].pixKey || '');
                        alert('Chave PIX copiada com sucesso!');
                      }}
                      style={{background: '#f59e0b', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem'}}
                    >
                      Copiar Chave
                    </button>
                  </div>
                  <p style={{margin: '12px 0 0', fontSize: '0.75rem', color: '#b45309', fontWeight: 600, lineHeight: 1.4}}>
                    Realize a transferência PIX para liberar o motorista e registrar sua corrida.
                  </p>
                </div>
              )}

              <div style={{display:'flex',justifyContent:'center',gap:'8px',marginBottom:'32px'}}>
                {[1, 2, 3, 4, 5].map(star => (
                  <span 
                    key={star} 
                    onClick={() => setRatingStars(star)}
                    style={{
                      fontSize: '2.5rem', 
                      cursor: 'pointer',
                      color: ratingStars >= star ? '#f59e0b' : '#e2e8f0',
                      transition: 'color 0.2s ease'
                    }}>
                    ★
                  </span>
                ))}
              </div>

              {ratingStars > 0 && (
                <div style={{marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '16px'}}>
                  <p style={{fontWeight: 700, margin: '0 0 12px', color: '#334155'}}>Gostou do motorista?</p>
                  <button 
                    onClick={() => setTempDriverFav(!tempDriverFav)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                      width: '100%', padding: '12px', borderRadius: '12px',
                      background: tempDriverFav ? '#fef3c7' : '#fff',
                      border: tempDriverFav ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                      color: tempDriverFav ? '#b45309' : '#475569',
                      fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{tempDriverFav ? '★ Favoritado' : '☆ Salvar como Favorito'}</span>
                  </button>
                  <p style={{fontSize: '0.7rem', color: '#64748b', margin: '8px 0 0'}}>Seus motoristas favoritos são notificados primeiro nas próximas viagens.</p>
                </div>
              )}

              <button 
                className="btn btn-primary"
                style={{width: '100%', padding: '16px', fontSize: '1.05rem'}}
                disabled={ratingStars === 0}
                onClick={() => {
                  // Finalizar e salvar histórico
                  const d = new Date();
                  const today = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                  setRideHistory(prev => [{ id: Date.now(), date: today, origin: originAddr, dest: destAddr, price: getPrice(routeKm, vehicleType), vehicle: vehicleType === 'car' ? 'Carro' : 'Moto', status: 'COMPLETED' }, ...prev]);
                  
                  alert('Obrigado pela sua avaliação! 🌟');
                  resetFlow();
                }}
              >
                Enviar Avaliação
              </button>
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
                  <div className="menu-user-header">
                    <div className="user-avatar-large">{user?.name?.charAt(0)}</div>
                    <h2>{user?.name}</h2>
                    <div style={{fontSize:'0.8rem', color:'#00E676', fontWeight:700, marginTop:'4px'}}>Passageiro Elite</div>
                  </div>

                  <button className="menu-nav-btn" onClick={() => { resetFlow(); setIsMenuOpen(false) }}>
                    <span className="nav-icon"><MapPin size={18} /></span>
                    Nova Viagem
                  </button>
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('SCHEDULED')}>
                    <span className="nav-icon"><Calendar size={18} /></span>
                    Agendamentos
                    {scheduledRides.length > 0 && (
                      <span style={{
                        marginLeft: 'auto',
                        background: 'rgba(0,230,118,0.15)',
                        border: '1px solid rgba(0,230,118,0.3)',
                        color: '#00E676',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}>{scheduledRides.length}</span>
                    )}
                  </button>
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('PROFILE')}>
                    <span className="nav-icon"><User size={18} /></span>
                    Meu Perfil
                  </button>
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('HISTORY')}>
                    <span className="nav-icon"><Clock size={18} /></span>
                    Histórico
                  </button>
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('FAVORITES')}>
                    <span className="nav-icon"><Star size={18} /></span>
                    Favoritos
                  </button>
                  <div className="menu-spacer"></div>
                  <button className="menu-nav-btn text-danger" onClick={() => { logout(); navigate('/passageiro') }}>
                    <span className="nav-icon"><LogOut size={18} /></span>
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
                              ⚠️ Cancelada (Taxa de deslocamento de R$ 2,80 a ser cobrada na próxima corrida)
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
