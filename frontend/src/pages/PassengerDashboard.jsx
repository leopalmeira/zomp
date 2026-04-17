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

// Haversine fallback
const getDistance = (coords1, coords2) => {
  const [lat1, lon1] = coords1;
  const [lat2, lon2] = coords2;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function MapController({ center, markers }) {
  const map = useMap()
  useEffect(() => {
    if (markers && markers.length === 2 && markers[0] && markers[1]) {
      const bounds = L.latLngBounds([markers[0], markers[1]])
      map.flyToBounds(bounds, { padding: [50, 150], animate: true })
    } else if (center) {
      map.flyTo(center, 16)
    }
  }, [center, markers, map])
  return null
}

export default function PassengerDashboard() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  
  const [mapCenter, setMapCenter] = useState([-22.9068, -43.1729])
  const [origin, setOrigin] = useState({ address: 'Buscando seu local...', coords: null })
  const [destination, setDestination] = useState({ address: '', coords: null })
  
  const [activeInput, setActiveInput] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  
  const [routeGeometry, setRouteGeometry] = useState([])
  const [routeParams, setRouteParams] = useState({ km: 0, total: 0 })
  const [rideState, setRideState] = useState('IDLE') // IDLE, PRICED, SEARCHING, ACCEPTED, SCHEDULING
  
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [prioritizeFavs, setPrioritizeFavs] = useState(true)
  const [matchedDriver, setMatchedDriver] = useState(null)
  
  const [favoriteDrivers] = useState([
    { id: 1, name: 'Carlos', car: 'Chevrolet Onix', plate: 'BRA-2031', rating: '4.9', img: 'https://i.pravatar.cc/150?img=11' },
    { id: 2, name: 'Ana', car: 'Hyundai HB20', plate: 'XPT-9988', rating: '5.0', img: 'https://i.pravatar.cc/150?img=5' }
  ])

  // GPS Init
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const c = [pos.coords.latitude, pos.coords.longitude]
        setMapCenter(c)
        setOrigin({ address: 'Local Atual (GPS)', coords: c })
      })
    }
  }, [])

  // Routing Logic
  useEffect(() => {
    const fetchRoute = async () => {
      if (origin.coords && destination.coords && rideState === 'IDLE') {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${origin.coords[1]},${origin.coords[0]};${destination.coords[1]},${destination.coords[0]}?overview=full&geometries=geojson`
          const res = await fetch(url)
          const data = await res.json()
          if (data.routes?.[0]) {
            const r = data.routes[0]
            const km = (r.distance / 1000).toFixed(1)
            setRouteGeometry(r.geometry.coordinates.map(c => [c[1], c[0]]))
            setRouteParams({ km, total: (km * 2).toFixed(2) })
            setRideState('PRICED')
          }
        } catch (e) {
          const km = getDistance(origin.coords, destination.coords).toFixed(1)
          setRouteParams({ km, total: (km * 2).toFixed(2) })
          setRideState('PRICED')
        }
      }
    }
    fetchRoute()
  }, [origin.coords, destination.coords, rideState])

  const handleTyping = async (val, type) => {
    setActiveInput(type)
    if (type === 'origin') setOrigin({ ...origin, address: val })
    else setDestination({ ...destination, address: val })
    
    if (val.length > 3) {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=br&limit=5`)
      const d = await resp.json()
      setSuggestions(d)
    } else setSuggestions([])
  }

  const selectSuggestion = (s) => {
    const c = [parseFloat(s.lat), parseFloat(s.lon)]
    if (activeInput === 'origin') { setOrigin({ address: s.display_name.split(',')[0], coords: c }); setMapCenter(c); }
    else setDestination({ address: s.display_name.split(',')[0], coords: c });
    setSuggestions([])
    setActiveInput(null)
  }

  const handleCall = () => {
    setRideState('SEARCHING')
    setTimeout(() => {
      setMatchedDriver({ ...favoriteDrivers[0], eta: '3 min' })
      setRideState('ACCEPTED')
    }, 3000)
  }

  return (
    <div className="passenger-app">
      <div className="passenger-map-bg">
        <MapContainer center={mapCenter} zoom={16} zoomControl={false} style={{width:'100%', height:'100%'}}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapController center={mapCenter} markers={origin.coords && destination.coords ? [origin.coords, destination.coords] : null} />
          {origin.coords && <Marker position={origin.coords} icon={originIcon} />}
          {destination.coords && <Marker position={destination.coords} icon={destIcon} />}
          {routeGeometry.length > 0 && <Polyline positions={routeGeometry} color="#000" weight={5} opacity={0.7} />}
        </MapContainer>
        {!origin.coords && <div className="absolute-center-pin-wrapper"><div className="center-pin modern-dynamic"><div className="pin-head"></div><div className="pin-shadow"></div></div></div>}
      </div>

      <div className="passenger-top-header">
        <div className="menu-btn" onClick={() => setIsMenuOpen(true)}>☰</div>
      </div>

      <div className={`passenger-bottom-sheet ${isSheetCollapsed ? 'collapsed' : ''}`}>
        <div className="sheet-drag-area" onClick={() => setIsSheetCollapsed(!isSheetCollapsed)}><div className="sheet-handle"></div></div>
        
        <div className="sheet-content-wrapper">
          {rideState === 'IDLE' && (
            <div className="state-idle">
              <h2 className="sheet-title">Para onde vamos?</h2>
              <div className="route-inputs" style={{position:'relative'}}>
                <div className="route-timeline"><div className="dot-start"></div><div className="timeline-line"></div><div className="dot-end"></div></div>
                <div className="route-fields">
                  <div className="search-field-wrapper">
                    <input className="route-input" value={origin.address} onChange={e=>handleTyping(e.target.value,'origin')} placeholder="Origem" />
                    <button className="inline-search-btn">🔍</button>
                  </div>
                  <div className="search-field-wrapper">
                    <input className="route-input" value={destination.address} onChange={e=>handleTyping(e.target.value,'dest')} placeholder="Destino" />
                    <button className="inline-search-btn">🔍</button>
                  </div>
                </div>
                {suggestions.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {suggestions.map((s,i) => <div key={i} className="suggestion-item" onClick={()=>selectSuggestion(s)}>{s.display_name.split(',').slice(0,2).join(',')}</div>)}
                  </div>
                )}
              </div>
              <div className="favorites-section">
                <div className="section-header"><h3>Motoristas Favoritos</h3><span className="badge-nearby">Prioridade</span></div>
                <div className="favorites-scroll">
                  {favoriteDrivers.map(d => <div key={d.id} className="fav-driver-card"><img src={d.img} className="fav-img" /><span>{d.name}</span></div>)}
                </div>
              </div>
            </div>
          )}

          {rideState === 'PRICED' && (
            <div className="state-priced animate-fade-in-up">
              <h2 className="sheet-title">Resumo da Viagem</h2>
              <p className="route-desc">{origin.address} → {destination.address}</p>
              <div className="price-box">
                <div className="price-val">R$ {routeParams.total}</div>
                <div className="dist-val">{routeParams.km} km</div>
              </div>
              <div className="prioritize-toggle">
                <div><label>Priorizar Favoritos</label><p>Busca dedicada por 15s</p></div>
                <label className="switch"><input type="checkbox" checked={prioritizeFavs} onChange={e=>setPrioritizeFavs(e.target.checked)} /><span className="slider round"></span></label>
              </div>
              <div className="action-buttons mt-4">
                <button className="btn btn-schedule">Agendar</button>
                <button className="btn btn-primary btn-request" onClick={handleCall}>Chamar Agora</button>
              </div>
            </div>
          )}

          {rideState === 'SEARCHING' && <div className="text-center"><div className="search-radar"></div><h3>Buscando...</h3><button className="btn btn-secondary mt-4 w-full" onClick={()=>setRideState('PRICED')}>Cancelar</button></div>}

          {rideState === 'ACCEPTED' && matchedDriver && (
            <div className="state-accepted">
              <div className="match-header"><div className="badge-nearby">A Caminho</div><h3>{matchedDriver.eta}</h3></div>
              <div className="driver-card-large">
                <img src={matchedDriver.img} className="drv-avatar" />
                <div className="drv-info"><h4>{matchedDriver.name}</h4><span>⭐ {matchedDriver.rating}</span></div>
                <div className="drv-car"><span>{matchedDriver.car}</span><span className="car-plate">{matchedDriver.plate}</span></div>
              </div>
              <div className="action-buttons mt-4">
                <button className="btn btn-secondary" style={{flex:1}} onClick={()=>{setRideState('IDLE'); setDestination({address:'', coords:null}); setRouteGeometry([]);}}>Nova Viagem</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMenuOpen && <div className="side-menu-overlay" onClick={()=>setIsMenuOpen(false)}><div className="side-menu-drawer animate-slide-right" onClick={e=>e.stopPropagation()}><div className="drawer-close" onClick={()=>setIsMenuOpen(false)}>X</div><div className="menu-nav-list"><h3>Menu Zomp</h3><button onClick={()=>{logout();navigate('/passageiro')}}>Sair</button></div></div></div>}
    </div>
  )
}
