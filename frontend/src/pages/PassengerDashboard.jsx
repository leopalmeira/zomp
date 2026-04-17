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
      map.flyToBounds(bounds, { padding: [100, 100], animate: true })
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
  const [origin, setOrigin] = useState({ address: 'Local Atual (GPS)', coords: null })
  const [destination, setDestination] = useState({ address: '', coords: null })
  
  const [activeInput, setActiveInput] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  
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
      }, () => {
        setOrigin({ address: 'Rio de Janeiro, RJ', coords: [-22.9068, -43.1729] })
      })
    }
  }, [])

  // Routing Logic - Triggers when both coords exist
  useEffect(() => {
    if (origin.coords && destination.coords && rideState === 'IDLE') {
       const fetchRoute = async () => {
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
            setIsSheetCollapsed(false)
          }
        } catch (e) {
          const km = getDistance(origin.coords, destination.coords).toFixed(1)
          setRouteParams({ km, total: (km * 2).toFixed(2) })
          setRideState('PRICED')
          setIsSheetCollapsed(false)
        }
      }
      fetchRoute()
    }
  }, [origin.coords, destination.coords, rideState])

  const handleTyping = async (val, type) => {
    setActiveInput(type)
    if (type === 'origin') setOrigin({ ...origin, address: val, coords: null })
    else setDestination({ ...destination, address: val, coords: null })
    
    if (val.length > 3) {
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=br&limit=5`)
        const d = await resp.json()
        setSuggestions(d)
      } catch(ex) { console.error(ex) }
    } else setSuggestions([])
  }

  const handleManualSearch = async (type) => {
    const val = type === 'origin' ? origin.address : destination.address
    if (val.length < 3) return
    setIsSearching(true)
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=br&limit=1`)
      const d = await resp.json()
      if (d?.[0]) selectSuggestion(d[0], type)
    } finally { setIsSearching(false) }
  }

  const selectSuggestion = (s, forcedType) => {
    const type = forcedType || activeInput
    const c = [parseFloat(s.lat), parseFloat(s.lon)]
    const addr = s.display_name.split(',')[0]
    
    if (type === 'origin') {
      setOrigin({ address: addr, coords: c })
      setMapCenter(c)
    } else {
      setDestination({ address: addr, coords: c })
    }
    setSuggestions([])
    setActiveInput(null)
  }

  const resetFlow = () => {
    setDestination({ address: '', coords: null })
    setRouteGeometry([])
    setRideState('IDLE')
    setMatchedDriver(null)
    setIsSheetCollapsed(false)
  }

  return (
    <div className="passenger-app">
      <div className="passenger-map-bg">
        <MapContainer center={mapCenter} zoom={16} zoomControl={false} style={{width:'100%', height:'100%'}}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapController center={mapCenter} markers={origin.coords && destination.coords ? [origin.coords, destination.coords] : null} />
          {origin.coords && <Marker position={origin.coords} icon={originIcon} />}
          {destination.coords && <Marker position={destination.coords} icon={destIcon} />}
          {routeGeometry.length > 0 && <Polyline positions={routeGeometry} color="#000" weight={6} opacity={0.8} />}
        </MapContainer>
      </div>

      <div className="passenger-top-header">
        <div className="menu-btn" onClick={() => setIsMenuOpen(true)}>☰</div>
      </div>

      <div className={`passenger-bottom-sheet ${isSheetCollapsed ? 'collapsed' : ''}`}>
        <div className="sheet-drag-area" onClick={() => setIsSheetCollapsed(!isSheetCollapsed)}><div className="sheet-handle"></div></div>
        
        <div className="sheet-content-wrapper">
          {rideState === 'IDLE' && (
            <div className="state-idle animate-fade-in">
              <h2 className="sheet-title">Para onde vamos?</h2>
              <div className="route-inputs" style={{position:'relative'}}>
                <div className="route-timeline"><div className="dot-start"></div><div className="timeline-line"></div><div className="dot-end"></div></div>
                <div className="route-fields">
                  <div className="search-field-wrapper">
                    <input className="route-input" value={origin.address} onChange={e=>handleTyping(e.target.value,'origin')} onKeyDown={e=>e.key==='Enter'&&handleManualSearch('origin')} placeholder="Origem" />
                    <button className="inline-search-btn" onClick={()=>handleManualSearch('origin')}>{isSearching ? '...' : '🔍'}</button>
                  </div>
                  <div className="search-field-wrapper">
                    <input className="route-input" value={destination.address} onChange={e=>handleTyping(e.target.value,'dest')} onKeyDown={e=>e.key==='Enter'&&handleManualSearch('dest')} placeholder="Para onde?" />
                    <button className="inline-search-btn" onClick={()=>handleManualSearch('dest')}>{isSearching ? '...' : '🔍'}</button>
                  </div>
                </div>
                {suggestions.length > 0 && (
                  <div className="autocomplete-dropdown shadow-xl">
                    {suggestions.map((s,i) => (
                      <div key={i} className="suggestion-item" onClick={()=>selectSuggestion(s)}>
                         <span className="text-sm font-semibold">{s.display_name.split(',').slice(0,3).join(',')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="favorites-section mt-6">
                <div className="section-header"><h3>Motoristas Favoritos</h3><span className="badge-nearby">PRIORIDADE</span></div>
                <div className="favorites-scroll">
                  {favoriteDrivers.map(d => (
                    <div key={d.id} className="fav-driver-card">
                      <img src={d.img} className="fav-img" alt={d.name} />
                      <div className="fav-info"><span className="fav-name">{d.name}</span><span className="fav-dist">Até 10min</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {rideState === 'PRICED' && (
            <div className="state-priced animate-fade-in-up">
              <h2 className="sheet-title">Resumo</h2>
              <div className="route-desc-box mb-4">
                <div className="text-xs font-bold text-gray-400">TRAJETO</div>
                <div className="truncate font-semibold">{origin.address} → {destination.address}</div>
              </div>
              <div className="price-box mb-4">
                <div className="flex flex-col">
                  <span className="text-3xl font-black text-emerald-800">R$ {routeParams.total}</span>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">{routeParams.km} KM percorridos</span>
                </div>
              </div>
              <div className="prioritize-toggle mb-6">
                 <div><label className="font-bold">Priorizar Favoritos</label><p className="text-xs text-gray-500">Busca dedicada por 15s</p></div>
                 <label className="switch"><input type="checkbox" checked={prioritizeFavs} onChange={e=>setPrioritizeFavs(e.target.checked)} /><span className="slider round"></span></label>
              </div>
              <div className="action-buttons gap-3">
                <button className="btn btn-secondary flex-1 py-4 font-bold" onClick={()=>alert('Agendado!')}>Agendar</button>
                <button className="btn btn-primary flex-[2] py-4 font-bold text-lg" onClick={()=>{setRideState('SEARCHING'); setTimeout(()=>setRideState('ACCEPTED'), 3000)}}>Chamar Agora</button>
              </div>
              <button className="w-full mt-4 text-sm font-bold text-gray-400 uppercase tracking-tighter" onClick={resetFlow}>Alterar Trajeto</button>
            </div>
          )}

          {rideState === 'SEARCHING' && (
            <div className="py-12 text-center animate-pulse">
              <div className="search-radar mb-6"></div>
              <h3 className="text-xl font-black">Buscando Motorista...</h3>
              <p className="text-sm text-gray-500 mb-6">Notificando parceiros favoritos próximos</p>
              <button className="btn btn-secondary w-full" onClick={()=>setRideState('PRICED')}>Cancelar</button>
            </div>
          )}

          {rideState === 'ACCEPTED' && (
             <div className="state-accepted animate-slide-up">
                <div className="flex justify-between items-center mb-6">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-black">MOTORISTA A CAMINHO</span>
                  <span className="text-2xl font-black">3 min</span>
                </div>
                <div className="driver-card-large p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4 mb-6">
                   <img src={favoriteDrivers[0].img} className="w-16 h-16 rounded-full border-2 border-white shadow-sm" alt="driver" />
                   <div className="flex-1">
                      <div className="font-bold text-lg">{favoriteDrivers[0].name}</div>
                      <div className="text-amber-500 font-bold">⭐ 4.9</div>
                   </div>
                   <div className="text-right">
                      <div className="font-bold">{favoriteDrivers[0].car}</div>
                      <div className="text-sm bg-gray-200 px-2 rounded font-mono">{favoriteDrivers[0].plate}</div>
                   </div>
                </div>
                <div className="flex gap-4">
                   <button className="btn btn-secondary flex-1 font-bold">Mensagem</button>
                   <button className="btn btn-secondary flex-1 font-bold text-red-500" onClick={resetFlow}>Cancelar Corrida</button>
                </div>
             </div>
          )}
        </div>
      </div>

      {isMenuOpen && (
        <div className="side-menu-overlay" onClick={()=>setIsMenuOpen(false)}>
          <div className="side-menu-drawer animate-slide-right" onClick={e=>e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center">
               <span className="font-black text-xl">ZOMP MENU</span>
               <button className="text-2xl" onClick={()=>setIsMenuOpen(false)}>✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
               <button className="text-left font-bold text-lg py-2 border-b">Perfil</button>
               <button className="text-left font-bold text-lg py-2 border-b">Histórico</button>
               <button className="text-left font-bold text-lg py-2 border-b">Favoritos</button>
               <button className="text-left font-bold text-lg py-2 border-b text-red-500" onClick={()=>{logout(); navigate('/passageiro')}}>Sair do App</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
